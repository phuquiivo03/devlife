import { describe, expect, it } from "vitest";
import {
  applyAccept,
  applyDayStarted,
  applyStudy,
  applyWake,
  defaultCareer,
  ensureTodayBoard,
  grantRawXp,
} from "../../src/game/career/actions";
import { SIM_CATALOG } from "../../src/game/career/content";
import { jobPay } from "../../src/game/life/logic";
import {
  formatRankLabel,
  grantedXp,
  levelProgressPercent,
  overallRankBracket,
  rankBracketForLevel,
  rankProgressPercent,
  skillProgressList,
  studyBlockReason,
  xpMultiplier,
} from "../../src/game/knowledge/logic";
import {
  deadlineDaysForTier,
  freelanceGoal,
  jobEligibility,
  selectBoardTemplates,
  skillNameMap,
  visibleBoardJobs,
} from "../../src/game/jobs/logic";
import { MemoryStorageAdapter, toStateStorage } from "../../src/game/storage/adapter";
import { migrateSave } from "../../src/game/storage/migrate";
import {
  DEFAULT_START_MINUTES,
  advanceMinutes,
  sleepToNextMorning,
  snapshot,
} from "../../src/game/time";

const config = SIM_CATALOG.config;

describe("xp multipliers", () => {
  it("uses full study XP and 30% job XP below the cap", () => {
    expect(xpMultiplier(1, "study", config)).toBe(1);
    expect(xpMultiplier(5, "job", config)).toBe(0.3);
    expect(grantedXp(80, 1, "study", config)).toBe(80);
    expect(grantedXp(50, 1, "job", config)).toBe(15);
    expect(grantedXp(1, 2, "job", config)).toBe(0);
  });

  it("flips at the configured cap and floors the grant", () => {
    expect(config.study_cap_level).toBe(6);
    expect(xpMultiplier(6, "study", config)).toBe(0.1);
    expect(xpMultiplier(10, "job", config)).toBe(1);
    expect(grantedXp(55, 6, "study", config)).toBe(5);
    expect(grantedXp(70, 6, "job", config)).toBe(70);
  });
});

describe("rank brackets", () => {
  const brackets = config.rank_brackets;

  it("maps levels onto Intern, Junior, Middle, and Senior", () => {
    expect(rankBracketForLevel(1, brackets).id).toBe("intern");
    expect(rankBracketForLevel(2, brackets).id).toBe("intern");
    expect(rankBracketForLevel(3, brackets).id).toBe("junior");
    expect(rankBracketForLevel(4, brackets).id).toBe("junior");
    expect(rankBracketForLevel(5, brackets).id).toBe("middle");
    expect(rankBracketForLevel(7, brackets).id).toBe("middle");
    expect(rankBracketForLevel(8, brackets).id).toBe("senior");
    expect(rankBracketForLevel(10, brackets).id).toBe("senior");
  });

  it("reports progress inside the bracket, including the Junior 60% example", () => {
    const junior = rankBracketForLevel(4, brackets);
    const percent = rankProgressPercent(4, 60, 300, junior);
    expect(percent).toBe(60);
    expect(formatRankLabel("Frontend", junior.label, percent)).toBe("Frontend: Junior 60%");
    expect(rankProgressPercent(1, 0, 100, rankBracketForLevel(1, brackets))).toBe(0);
    expect(rankProgressPercent(10, 0, 0, rankBracketForLevel(10, brackets))).toBe(100);
    expect(levelProgressPercent(10, 0, SIM_CATALOG.skillLevelXp)).toBe(100);
    expect(levelProgressPercent(1, 40, SIM_CATALOG.skillLevelXp)).toBe(40);
  });

  it("uses the mean skill level as the overall rank", () => {
    expect(overallRankBracket([1, 1, 1, 1, 1], brackets).id).toBe("intern");
    expect(overallRankBracket([4, 1, 1, 1, 1], brackets).id).toBe("intern");
    expect(overallRankBracket([4, 4, 4, 3, 4], brackets).id).toBe("junior");
    expect(overallRankBracket([], brackets).id).toBe("intern");
    expect(freelanceGoal(SIM_CATALOG.milestones)).toBe(100);
  });
});

describe("skill progress rows", () => {
  it("uses one view for every catalog skill, including a missing save row", () => {
    const rows = skillProgressList(
      [{ skill_id: "frontend", level: 4, xp: 60 }],
      SIM_CATALOG,
    );
    expect(rows.map((row) => row.id)).toEqual([
      "frontend",
      "backend",
      "database",
      "devops",
      "soft",
    ]);
    expect(rows[0]).toMatchObject({
      name: "Frontend",
      icon: "skill_frontend",
      level: 4,
      xp: 60,
      xpToNext: 300,
      levelPercent: 20,
      rankId: "junior",
      rankLabel: "Junior",
      rankPercent: 60,
      summary: "Frontend: Junior 60%",
      xpLine: "60/300 XP",
    });
    expect(rows.find((row) => row.id === "backend")).toMatchObject({
      level: 1,
      xp: 0,
      xpToNext: 100,
      rankId: "intern",
      xpLine: "0/100 XP",
    });
  });

  it("follows XP granted on the career state, including the level cap", () => {
    const start = defaultCareer(1, 480, "student", SIM_CATALOG);
    const granted = grantRawXp(start, "frontend", 40, SIM_CATALOG);
    const rows = skillProgressList(granted.state.player_skills, SIM_CATALOG);
    expect(rows.find((row) => row.id === "frontend")).toMatchObject({
      level: 1,
      xp: 40,
      xpToNext: 100,
      levelPercent: 40,
      xpLine: "40/100 XP",
    });

    const capped = skillProgressList(
      [{ skill_id: "soft", level: 10, xp: 0 }],
      SIM_CATALOG,
    );
    expect(capped.find((row) => row.id === "soft")).toMatchObject({
      level: 10,
      xpToNext: 0,
      levelPercent: 100,
      rankId: "senior",
      rankPercent: 100,
      xpLine: "tối đa",
    });
  });
});

describe("eligibility", () => {
  const start = defaultCareer(1, 480, "student", SIM_CATALOG);

  it("blocks a course for money, energy, or both", () => {
    expect(studyBlockReason(1_500_000, 70, { price: 200_000, energy: 12 })).toBeNull();
    expect(studyBlockReason(100, 70, { price: 200_000, energy: 12 })).toBe("Không đủ tiền");
    expect(studyBlockReason(1_500_000, 10, { price: 200_000, energy: 12 })).toBe(
      "Không đủ năng lượng",
    );
    expect(studyBlockReason(100, 10, { price: 200_000, energy: 12 })).toBe(
      "Không đủ tiền và năng lượng",
    );
  });

  it("locks a task when skill, reputation, energy, or freelance count is short", () => {
    const names = skillNameMap(SIM_CATALOG.skills);
    const easy = SIM_CATALOG.jobTemplates.find((row) => row.id === "landing-html")!;
    const hard = SIM_CATALOG.jobTemplates.find((row) => row.id === "rest-api")!;
    const review = SIM_CATALOG.jobTemplates.find((row) => row.id === "code-review")!;
    const migration = SIM_CATALOG.jobTemplates.find((row) => row.id === "migration")!;

    expect(
      jobEligibility(
        start.players,
        start.player_skills,
        easy,
        SIM_CATALOG.jobTemplateRequirements.filter((row) => row.template_id === easy.id),
        names,
      ).ok,
    ).toBe(true);

    const skillLock = jobEligibility(
      start.players,
      start.player_skills,
      hard,
      SIM_CATALOG.jobTemplateRequirements.filter((row) => row.template_id === hard.id),
      names,
    );
    expect(skillLock.ok).toBe(false);
    expect(skillLock.missing).toContain("Cần Backend cấp 2");

    const repLock = jobEligibility(
      start.players,
      start.player_skills,
      review,
      SIM_CATALOG.jobTemplateRequirements.filter((row) => row.template_id === review.id),
      names,
    );
    expect(repLock.missing.some((line) => line.includes("uy tín"))).toBe(true);

    const countLock = jobEligibility(
      start.players,
      start.player_skills,
      migration,
      SIM_CATALOG.jobTemplateRequirements.filter((row) => row.template_id === migration.id),
      names,
    );
    expect(countLock.missing.some((line) => line.includes("freelance"))).toBe(true);

    const tired = jobEligibility(
      { ...start.players, energy: 1 },
      start.player_skills,
      easy,
      SIM_CATALOG.jobTemplateRequirements.filter((row) => row.template_id === easy.id),
      names,
    );
    expect(tired.missing).toContain("Cần 8 năng lượng");
  });
});

describe("board generation", () => {
  it("is deterministic, freelance-only, and keeps a locked card beside an open one", () => {
    const start = defaultCareer(1, 480, "student", SIM_CATALOG);
    const names = skillNameMap(SIM_CATALOG.skills);
    const eligible = (template: (typeof SIM_CATALOG.jobTemplates)[number]) =>
      jobEligibility(
        start.players,
        start.player_skills,
        template,
        SIM_CATALOG.jobTemplateRequirements.filter((row) => row.template_id === template.id),
        names,
      ).ok;

    const first = selectBoardTemplates(
      SIM_CATALOG.jobTemplates,
      1,
      config.board_size,
      eligible,
    );
    const again = selectBoardTemplates(
      SIM_CATALOG.jobTemplates,
      1,
      config.board_size,
      eligible,
    );
    expect(first.map((row) => row.id)).toEqual(again.map((row) => row.id));
    expect(first).toHaveLength(config.board_size);
    expect(new Set(first.map((row) => row.id)).size).toBe(config.board_size);
    expect(first.every((row) => row.job_type === "freelance")).toBe(true);
    expect(first.some((row) => eligible(row))).toBe(true);
    expect(first.some((row) => !eligible(row))).toBe(true);
  });

  it("expires yesterday's offers and leaves completed jobs in place", () => {
    const start = defaultCareer(1, 480, "student", SIM_CATALOG);
    const day1 = ensureTodayBoard(start, 1, SIM_CATALOG);
    const open = visibleBoardJobs(day1.state.player_jobs, 1).find(
      (job) => job.status === "offered",
    )!;
    const accepted = applyAccept(day1.state, open.id, SIM_CATALOG);
    expect(accepted.error).toBeNull();
    expect(accepted.state.player_jobs.find((job) => job.id === open.id)?.status).toBe(
      "completed",
    );

    const day2 = applyDayStarted(accepted.state, 2, 360, "student", SIM_CATALOG);
    const still = day2.state.player_jobs.find((job) => job.id === open.id);
    expect(still?.status).toBe("completed");
    const expired = day2.state.player_jobs.filter(
      (job) => job.offered_day === 1 && job.status === "expired",
    );
    expect(expired.length).toBeGreaterThan(0);
    expect(visibleBoardJobs(day2.state.player_jobs, 2)).toHaveLength(config.board_size);
    expect(day2.events.some((event) => event.type === "jobBoardRefreshed")).toBe(true);
    expect(day2.state.players.energy).toBe(accepted.state.players.energy);
    expect(day2.events.some((event) => event.type === "energyChanged")).toBe(false);
  });
});

describe("energy refill", () => {
  it("keeps the deducted energy when a course crosses midnight", () => {
    const night = 23 * 60;
    const start = defaultCareer(1, night, "student", SIM_CATALOG);
    const bought = applyStudy(start, "html", SIM_CATALOG);
    expect(bought.error).toBeNull();
    const advanced = advanceMinutes(night, bought.minutes);
    const dayEvent = advanced.events.find((event) => event.type === "dayStarted");
    expect(dayEvent).toMatchObject({ type: "dayStarted", day: 2 });
    const afterMidnight = applyDayStarted(
      bought.state,
      2,
      snapshot(advanced.totalMinutes).minuteOfDay,
      "student",
      SIM_CATALOG,
    );
    expect(afterMidnight.state.players.energy).toBe(start.players.energy - 12);
    expect(afterMidnight.events.some((event) => event.type === "energyChanged")).toBe(false);
  });

  it("refills to energyOnSleep on sleep, after dayStarted", () => {
    expect(config.energyOnSleep).toBe(100);
    const from = 22 * 60;
    const base = defaultCareer(1, from, "student", SIM_CATALOG);
    const tired = { ...base, players: { ...base.players, energy: 40 } };
    const slept = sleepToNextMorning(from);
    const types = slept.events.map((event) => event.type);
    const dayIndex = types.indexOf("dayStarted");
    const sleepIndex = types.indexOf("sleep");
    expect(dayIndex).toBeGreaterThanOrEqual(0);
    expect(sleepIndex).toBeGreaterThan(dayIndex);

    const dayEvent = slept.events[dayIndex];
    if (!dayEvent || dayEvent.type !== "dayStarted") {
      throw new Error("sleep did not emit dayStarted");
    }
    const afterDay = applyDayStarted(
      tired,
      dayEvent.day,
      snapshot(dayEvent.totalMinutes).minuteOfDay,
      "student",
      SIM_CATALOG,
    );
    expect(afterDay.state.players.energy).toBe(40);

    const afterSleep = applyWake(afterDay.state, 8);
    expect(afterSleep.state.players.energy).toBe(config.energyOnSleep);
    expect(afterSleep.events).toContainEqual({
      type: "energyChanged",
      delta: config.energyOnSleep - 40,
      energy: config.energyOnSleep,
    });
  });
});

describe("study and instant jobs", () => {
  it("buys a course only when money and energy cover it", () => {
    const start = defaultCareer(1, 480, "student", SIM_CATALOG);
    const broke = { ...start, players: { ...start.players, money: 1_000 } };
    const blocked = applyStudy(broke, "sysdesign", SIM_CATALOG);
    expect(blocked.error).toBe("Không đủ tiền");
    expect(blocked.state.players.money).toBe(broke.players.money);

    const bought = applyStudy(start, "html", SIM_CATALOG);
    expect(bought.error).toBeNull();
    expect(bought.minutes).toBe(120);
    expect(bought.state.players.money).toBe(config.starting_money - 200_000);
    expect(bought.state.players.energy).toBe(70 - 12);
    const frontend = bought.state.player_skills.find((row) => row.skill_id === "frontend");
    expect(frontend).toEqual({ skill_id: "frontend", level: 1, xp: 80 });
    expect(bought.events.some((event) => event.type === "studyCompleted")).toBe(true);
    expect(bought.state.player_study_completions).toEqual([
      { activity_id: "html", skill_id: "frontend", xp_gained: 80, completed_day: 1 },
    ]);

    const again = applyStudy(bought.state, "html", SIM_CATALOG);
    expect(again.error).toBe("Đã học khóa này");
    expect(again.state.players.money).toBe(bought.state.players.money);
    expect(again.state.player_study_completions).toHaveLength(1);
  });

  it("records the finish day after a course crosses midnight", () => {
    const start = defaultCareer(1, 23 * 60, "student", SIM_CATALOG);
    const bought = applyStudy(start, "html", SIM_CATALOG);
    expect(bought.state.player_study_completions).toEqual([
      { activity_id: "html", skill_id: "frontend", xp_gained: 80, completed_day: 2 },
    ]);
  });

  it("lets a repeatable course be bought again and replaces its completion", () => {
    const catalog = {
      ...SIM_CATALOG,
      studyActivities: SIM_CATALOG.studyActivities.map((activity) =>
        activity.id === "html" ? { ...activity, repeatable: true } : activity,
      ),
    };
    const start = defaultCareer(1, 480, "student", catalog);
    const first = applyStudy(start, "html", catalog);
    const second = applyStudy(first.state, "html", catalog);
    expect(second.error).toBeNull();
    expect(second.state.players.money).toBe(config.starting_money - 400_000);
    expect(second.state.player_study_completions).toEqual([
      { activity_id: "html", skill_id: "frontend", xp_gained: 80, completed_day: 1 },
    ]);
  });

  it("completes an offered task in one step and applies the job multiplier", () => {
    const start = defaultCareer(1, 480, "student", SIM_CATALOG);
    const names = skillNameMap(SIM_CATALOG.skills);
    const board = ensureTodayBoard(start, 1, SIM_CATALOG);
    const open = board.state.player_jobs.find((job) => {
      const template = SIM_CATALOG.jobTemplates.find((row) => row.id === job.template_id);
      if (!template || job.status !== "offered") return false;
      return jobEligibility(
        start.players,
        start.player_skills,
        template,
        SIM_CATALOG.jobTemplateRequirements.filter((row) => row.template_id === template.id),
        names,
      ).ok;
    });
    expect(open?.status).toBe("offered");
    if (!open) return;
    const template = SIM_CATALOG.jobTemplates.find((row) => row.id === open.template_id)!;

    const done = applyAccept(
      {
        ...board.state,
        players: { ...board.state.players, freelance_completed: 9 },
      },
      open.id,
      SIM_CATALOG,
    );
    expect(done.error).toBeNull();
    const job = done.state.player_jobs.find((row) => row.id === open.id)!;
    expect(job.status).toBe("completed");
    expect(job.progress_hours).toBe(0);
    expect(job.bugs).toBe(0);
    expect(job.accepted_day).toBe(1);
    expect(job.finished_day).toBe(1);
    expect(job.deadline_day).toBe(open.offered_day + deadlineDaysForTier(template.tier));
    expect(done.state.players.money).toBe(
      start.players.money + jobPay(template.pay, template.tier, start.players.reputation),
    );
    expect(done.state.players.energy).toBe(start.players.energy - template.energy);
    expect(done.state.players.freelance_completed).toBe(10);
    expect(done.state.players.reputation).toBe(template.reputation_gain);
    const grants = SIM_CATALOG.jobTemplateXp.filter((row) => row.template_id === template.id);
    for (const grant of grants) {
      const skill = done.state.player_skills.find((row) => row.skill_id === grant.skill_id)!;
      expect(skill.xp).toBe(Math.floor(grant.xp * config.job_xp_multiplier_below));
    }
    expect(done.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "jobAccepted",
        "jobCompleted",
        "moneyChanged",
        "energyChanged",
        "skillXpGained",
        "milestoneReached",
      ]),
    );
    expect(done.state.player_unlocks).toEqual([
      { milestone_id: "freelance-10", reached_day: 1 },
    ]);
  });

  it("grants raw XP through exactly one level for the debug popup", () => {
    const start = defaultCareer(1, 480, "student", SIM_CATALOG);
    const leveled = grantRawXp(start, "frontend", 100, SIM_CATALOG);
    const frontend = leveled.state.player_skills.find((row) => row.skill_id === "frontend");
    expect(frontend).toEqual({ skill_id: "frontend", level: 2, xp: 0 });
    expect(leveled.events.filter((event) => event.type === "skillLevelUp")).toEqual([
      { type: "skillLevelUp", skillId: "frontend", level: 2, rankId: "intern" },
    ]);
  });
});

describe("migration", () => {
  it("keeps a v2 room and clock and starts a fresh career", () => {
    const saved = migrateSave(
      {
        stage: "junior",
        loadouts: { student: { desk: "a" }, junior: {}, senior: {} },
        showCharacter: false,
        totalMinutes: 2000,
        career: { players: { money: 1 } },
      },
      2,
    );
    expect(saved.stage).toBe("student");
    expect(saved.career.shop).toEqual({ owned: [], pin: null });
    expect(saved.showCharacter).toBe(false);
    expect(saved.loadouts.student.desk).toBe("a");
    expect(saved.totalMinutes).toBe(2000);
    expect(saved.career.players.money).toBe(config.starting_money);
    expect(saved.career.players.energy).toBe(config.starting_energy);
    expect(saved.career.player_skills).toHaveLength(5);
    expect(saved.career.player_jobs).toEqual([]);
    expect(saved.career.players.game_day).toBe(2);
  });

  it("drops a v1 clock and still adds the career tables", () => {
    const saved = migrateSave({ stage: "student", showCharacter: true }, 1);
    expect(saved.totalMinutes).toBe(DEFAULT_START_MINUTES);
    expect(saved.career.players.game_day).toBe(1);
    expect(saved.career.players.game_minute).toBe(DEFAULT_START_MINUTES);
  });

  it("keeps version 3 skills, jobs, and money", () => {
    const saved = migrateSave(
      {
        stage: "student",
        showCharacter: true,
        totalMinutes: 480,
        career: {
          players: {
            id: "local",
            money: 42,
            energy: 15,
            reputation: 4,
            freelance_completed: 3,
          },
          player_skills: [{ skill_id: "frontend", level: 4, xp: 12 }],
          player_jobs: [
            {
              id: "job-1-fix-css",
              template_id: "fix-css",
              job_type: "freelance",
              status: "completed",
              hours_required: 1,
              progress_hours: 0,
              bugs: 0,
              pay: 120000,
              offered_day: 1,
              accepted_day: 1,
              deadline_day: 2,
              finished_day: 1,
              missed_days: 0,
            },
          ],
          player_unlocks: [{ milestone_id: "freelance-10", reached_day: 4 }],
          player_events: [{ id: "e-1", type: "moneyChanged", day: 1, payload: { delta: 1 } }],
        },
      },
      3,
    );
    expect(saved.career.players.money).toBe(42);
    expect(saved.career.players.energy).toBe(15);
    expect(saved.career.players.freelance_completed).toBe(3);
    expect(saved.career.player_skills.find((row) => row.skill_id === "frontend")).toEqual({
      skill_id: "frontend",
      level: 4,
      xp: 12,
    });
    expect(saved.career.player_skills.find((row) => row.skill_id === "soft")?.level).toBe(1);
    expect(saved.career.player_jobs[0]?.status).toBe("completed");
    expect(saved.career.player_unlocks).toHaveLength(1);
    expect(saved.career.player_events).toHaveLength(1);
    expect(saved.career.player_study_completions).toEqual([]);
  });

  it("treats a version 3 save as having completed no courses", () => {
    expect(SIM_CATALOG.studyActivities.every((activity) => activity.repeatable === false)).toBe(
      true,
    );
    const saved = migrateSave(
      {
        stage: "student",
        showCharacter: true,
        totalMinutes: 480,
        career: {
          players: { money: 900_000, energy: 40 },
          player_study_completions: [
            { activity_id: "html", skill_id: "frontend", xp_gained: 80, completed_day: 3 },
          ],
        },
      },
      3,
    );
    expect(saved.career.players.money).toBe(900_000);
    expect(saved.career.player_study_completions).toEqual([]);
  });

  it("keeps course completions written by a version 4 save", () => {
    const saved = migrateSave(
      {
        stage: "student",
        showCharacter: true,
        totalMinutes: 480,
        career: {
          players: { money: 900_000, energy: 40 },
          player_study_completions: [
            { activity_id: "html", skill_id: "frontend", xp_gained: 80, completed_day: 2 },
            { activity_id: "nope", skill_id: "not-a-skill", xp_gained: 1, completed_day: 1 },
          ],
        },
      },
      4,
    );
    expect(saved.career.player_study_completions).toEqual([
      { activity_id: "html", skill_id: "frontend", xp_gained: 80, completed_day: 2 },
    ]);
  });
});

describe("storage adapter", () => {
  it("round-trips a string through the Zustand state storage", () => {
    const adapter = new MemoryStorageAdapter();
    const storage = toStateStorage(adapter);
    storage.setItem("devlife:v1", "{\"version\":3}");
    expect(storage.getItem("devlife:v1")).toBe("{\"version\":3}");
    storage.removeItem("devlife:v1");
    expect(adapter.load("devlife:v1")).toBeNull();
  });
});
