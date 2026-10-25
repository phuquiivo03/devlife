import { describe, expect, it } from "vitest";
import { SIM_CATALOG } from "@/game/career/content";
import { defaultCareer } from "@/game/career/actions";
import { PERSIST_VERSION } from "@/game/config";
import { LIFE } from "@/game/life/content";
import { monthKey } from "@/game/life/logic";
import { migrateSave } from "@/game/storage/migrate";
import {
  FULLTIME,
  POSITIONS,
  acceptApplication,
  addCompanyStrike,
  applyToPosition,
  boardPositionsOf,
  chanceLabel,
  closeFiredPopup,
  fitFor,
  freelanceNoticeEvery,
  fulltimeDayStart,
  passChanceFor,
  paydayDue,
  pendingApplications,
  quotedSalaryFor,
  settlePayday,
  weekStartOf,
} from "@/game/jobs/fulltime";
import { applyJobDeadlines } from "@/game/jobs/deadlines";
import { grantTaskSuccess } from "@/game/task-run/apply";
import { tickJobOffers } from "@/game/jobs/offers";
import type { CareerState, PlayerJob } from "@/game/career/types";

const FE_INTERN = POSITIONS.find((row) => row.id === "fe-intern-pixelweb")!;
const BE_MIDDLE = POSITIONS.find((row) => row.id === "be-middle-mekong")!;

function base(overrides?: { level?: number; rep?: number; day?: number }): CareerState {
  const state = defaultCareer(overrides?.day ?? 1, 8 * 60, "student", SIM_CATALOG);
  const level = overrides?.level ?? 1;
  return {
    ...state,
    players: {
      ...state.players,
      reputation: overrides?.rep ?? 0,
      energy: 100,
      money: 5_000_000,
      mood: 70,
    },
    player_skills: state.player_skills.map((skill) => ({ ...skill, level })),
  };
}

function companyJob(partial: Partial<PlayerJob> = {}): PlayerJob {
  const template = SIM_CATALOG.jobTemplates.find((row) => row.id === "landing-html")!;
  return {
    id: "ctask-2-landing-html-0",
    template_id: template.id,
    job_type: template.job_type,
    source: "company",
    status: "offered",
    hours_required: template.hours,
    progress_hours: 0,
    bugs: 0,
    pay: 0,
    offered_day: 1,
    accepted_day: null,
    deadline_day: 3,
    finished_day: null,
    missed_days: 0,
    task_run: null,
    ...partial,
  };
}

function employed(positionId: string, day: number, partial: Partial<CareerState["employment"]["current"]> = {}): CareerState {
  const state = base({ day });
  const position = POSITIONS.find((row) => row.id === positionId)!;
  return {
    ...state,
    employment: {
      ...state.employment,
      current: {
        positionId,
        company: position.company,
        title: position.title,
        salary: 10_000_000,
        fit: 1,
        startDay: day,
        strikes: 0,
        monthPenalty: 0,
        daysWorkedThisMonth: 10,
        countedMonthKey: monthKey(day),
        strikesThisMonth: 0,
        totalDays: 10,
        lateTasks: 0,
        ...partial,
      },
    },
  };
}

describe("full-time config", () => {
  it("ships the agreed numbers", () => {
    expect(PERSIST_VERSION).toBeGreaterThanOrEqual(22);
    expect(FULLTIME.base_salary).toEqual({
      intern: 5_000_000,
      junior: 10_000_000,
      middle: 18_000_000,
      senior: 30_000_000,
    });
    expect(FULLTIME.strike_fire).toBe(3);
    expect(FULLTIME.strike_warn).toBe(2);
    expect(FULLTIME.late_penalty_pct).toBe(0.05);
    expect(FULLTIME.block_days).toBe(30);
    expect(FULLTIME.apply_energy).toBe(5);
    expect(FULLTIME.apply_max_pending).toBe(3);
    expect(FULLTIME.offer_expire_days).toBe(2);
    expect(FULLTIME.freelance_notice_divisor).toBe(2);
  });

  it("authors enough positions with unique ids and requirements", () => {
    expect(POSITIONS.length).toBeGreaterThanOrEqual(20);
    const ids = new Set(POSITIONS.map((row) => row.id));
    expect(ids.size).toBe(POSITIONS.length);
    for (const position of POSITIONS) {
      expect(position.requirements.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("fit and pass chance", () => {
  it("returns 0.85 at exact requirements", () => {
    const state = base({ level: 2 });
    expect(fitFor(state, FE_INTERN)).toBeCloseTo(1, 5);
    expect(passChanceFor(fitFor(state, FE_INTERN), state)).toBeCloseTo(0.85, 5);
  });

  it("caps each ratio at 1.2 and the chance at 0.9", () => {
    const state = base({ level: 10 });
    // frontend 10/2 capped at 1.2, min_reputation 0 → rep ratio 1
    expect(fitFor(state, FE_INTERN)).toBeCloseTo(1.2 * 0.8 + 0.2, 5);
    expect(passChanceFor(fitFor(state, FE_INTERN), state)).toBe(0.9);
  });

  it("uses the cubic curve and labels the chance in words", () => {
    const state = base();
    expect(passChanceFor(0.8, state)).toBeCloseTo(0.85 * 0.8 ** 3, 5);
    expect(chanceLabel(passChanceFor(0.8, state))).toBe("Vừa");
    expect(chanceLabel(passChanceFor(0.6, state))).toBe("Thấp");
    expect(chanceLabel(0.85)).toBe("Cao");
    expect(chanceLabel(0.03)).toBe("Rất thấp");
    expect(passChanceFor(0.4, state)).toBeGreaterThanOrEqual(FULLTIME.pass.min);
  });

  it("adds the extrovert bonus", () => {
    const plain = base({ level: 2 });
    const extrovert = { ...plain, players: { ...plain.players, trait: "extrovert" as const } };
    expect(passChanceFor(0.6, extrovert)).toBeCloseTo(passChanceFor(0.6, plain) + 0.05, 5);
  });

  it("quotes the locked-in salary from fit", () => {
    expect(quotedSalaryFor(FE_INTERN, 1)).toBe(5_000_000);
    // fit 2 → capped at 1.5 → ×(0.9 + 0.15) = ×1.05
    expect(quotedSalaryFor(FE_INTERN, 2)).toBe(5_250_000);
    expect(quotedSalaryFor(FE_INTERN, 0)).toBe(4_500_000);
  });
});

describe("applyToPosition", () => {
  it("spends 5 energy and files one waiting application, deterministically", () => {
    const first = applyToPosition(base({ level: 2 }), FE_INTERN.id);
    expect(first.error).toBeNull();
    const apps = first.state.employment.applications;
    expect(apps).toHaveLength(1);
    expect(apps[0]).toMatchObject({ positionId: FE_INTERN.id, appliedDay: 1, outcome: "waiting" });
    expect(first.state.players.energy).toBe(95);

    const second = applyToPosition(base({ level: 2 }), FE_INTERN.id);
    expect(second.state.employment.applications[0]!.passed).toBe(apps[0]!.passed);
  });

  it("blocks repeat applies, the pending cap, and low energy", () => {
    const once = applyToPosition(base({ level: 2 }), FE_INTERN.id).state;
    expect(applyToPosition(once, FE_INTERN.id).error).toContain("tuần");

    let state = once;
    const others = POSITIONS.filter((row) => row.id !== FE_INTERN.id).slice(0, 2);
    for (const position of others) state = applyToPosition(state, position.id).state;
    expect(pendingApplications(state.employment)).toHaveLength(3);
    const fourth = POSITIONS.find(
      (row) => row.id !== FE_INTERN.id && !others.some((other) => other.id === row.id),
    )!;
    expect(applyToPosition(state, fourth.id).error).toContain("3 đơn");

    const tired = { ...base({ level: 2 }), players: { ...base({ level: 2 }).players, energy: 3 } };
    expect(applyToPosition(tired, BE_MIDDLE.id).error).toContain("năng lượng");
  });

  it("refuses a company that fired the player", () => {
    const state = {
      ...base({ level: 8 }),
      employment: {
        ...base().employment,
        blockedCompanies: { [BE_MIDDLE.company]: 31 },
      },
    };
    expect(applyToPosition(state, BE_MIDDLE.id).error).toContain(BE_MIDDLE.company);
  });
});

describe("application results on the next day", () => {
  it("posts an offer notice with Nhận việc / Từ chối", () => {
    const applied = applyToPosition(base({ level: 2 }), FE_INTERN.id).state;
    const app = applied.employment.applications[0]!;
    const passed = {
      ...applied,
      employment: {
        ...applied.employment,
        applications: [{ ...app, passed: true }],
      },
    };
    const next = fulltimeDayStart(passed, 2, 6 * 60);
    const notice = next.feed.notices.find((row) => row.id === `ft-offer-${app.id}`);
    expect(notice).toBeTruthy();
    expect(notice?.actions?.map((button) => button.id)).toEqual(["acceptPosition", "declinePosition"]);
    expect(notice?.text).toContain(FE_INTERN.company);
    expect(notice?.text).toContain("/tháng");
    expect(next.employment.applications[0]!.notified).toBe(true);
  });

  it("posts a rejection with the missing-skill hint", () => {
    const applied = applyToPosition(base({ level: 1 }), BE_MIDDLE.id).state;
    const app = applied.employment.applications[0]!;
    const failed = {
      ...applied,
      employment: {
        ...applied.employment,
        applications: [{ ...app, passed: false }],
      },
    };
    const next = fulltimeDayStart(failed, 2, 6 * 60);
    const notice = next.feed.notices.find((row) => row.id === `ft-reject-${app.id}`);
    expect(notice).toBeTruthy();
    expect(notice?.text).toContain("chưa phù hợp");
    expect(notice?.detail).toContain("cấp");
    expect(notice?.actions?.map((button) => button.id)).toEqual(["dismissNotice"]);
  });

  it("expires an unaccepted offer after two days", () => {
    const applied = applyToPosition(base({ level: 2 }), FE_INTERN.id).state;
    const app = applied.employment.applications[0]!;
    const passed = {
      ...applied,
      employment: { ...applied.employment, applications: [{ ...app, passed: true }] },
    };
    const day2 = fulltimeDayStart(passed, 2, 6 * 60);
    const day4 = fulltimeDayStart(day2, 4, 6 * 60);
    expect(day4.feed.notices.some((row) => row.id === `ft-offer-${app.id}`)).toBe(false);
    expect(day4.employment.applications[0]!.outcome).toBe("expired");
  });
});

describe("accepting a job", () => {
  it("locks the quoted salary into employment", () => {
    const applied = applyToPosition(base({ level: 2 }), FE_INTERN.id).state;
    const app = applied.employment.applications[0]!;
    const passed = {
      ...applied,
      employment: { ...applied.employment, applications: [{ ...app, passed: true }] },
    };
    const day2 = fulltimeDayStart(passed, 2, 6 * 60);
    const onDay2 = { ...day2, players: { ...day2.players, game_day: 2 } };
    const joined = acceptApplication(onDay2, app.id);
    expect(joined.error).toBeNull();
    expect(joined.state.employment.current).toMatchObject({
      positionId: FE_INTERN.id,
      company: FE_INTERN.company,
      salary: app.quotedSalary,
      startDay: 2,
      daysWorkedThisMonth: 1,
    });
    expect(
      joined.state.feed.notices.some((row) => row.payload?.applicationId === app.id),
    ).toBe(false);
    expect(joined.state.employment.applications[0]!.outcome).toBe("accepted");
  });

  it("quits the old job: tasks cancel and accrued pay waits for payday", () => {
    const old = employed(FE_INTERN.id, 2);
    const withTask = { ...old, player_jobs: [companyJob({ status: "active" })] };
    const applied = applyToPosition({ ...withTask, players: { ...withTask.players, game_day: 3 } }, BE_MIDDLE.id).state;
    const app = applied.employment.applications[0]!;
    const passed = {
      ...applied,
      employment: { ...applied.employment, applications: [{ ...app, passed: true, notified: true }] },
      feed: {
        ...applied.feed,
        notices: [
          ...applied.feed.notices,
          {
            id: `ft-offer-${app.id}`,
            day: 3,
            minute: 360,
            severity: "info" as const,
            icon: "icon_notif_job.png",
            title: BE_MIDDLE.title,
            text: "offer",
            action: "acceptPosition" as const,
            actions: [{ id: "acceptPosition" as const, label: "Nhận việc" }],
            payload: { applicationId: app.id },
            read: false,
          },
        ],
      },
    };
    const joined = acceptApplication(passed, app.id);
    expect(joined.error).toBeNull();
    expect(joined.state.employment.current?.company).toBe(BE_MIDDLE.company);
    expect(joined.state.player_jobs[0]!.status).toBe("quit");
    // 10 days × 10tr ÷ 28 days
    expect(joined.state.employment.pendingPayouts).toHaveLength(1);
    expect(joined.state.employment.pendingPayouts[0]!.amount).toBe(Math.round((10_000_000 * 10) / 28));
  });
});

describe("weekly board and company tasks", () => {
  it("keeps 4–6 positions and only rerolls on a new week", () => {
    const day1 = fulltimeDayStart(base(), 1, 6 * 60);
    const ids1 = day1.employment.board?.positionIds ?? [];
    expect(ids1.length).toBeGreaterThanOrEqual(FULLTIME.board_min);
    expect(ids1.length).toBeLessThanOrEqual(FULLTIME.board_max);
    expect(weekStartOf(1)).toBe(1);

    const day3 = fulltimeDayStart(day1, 3, 6 * 60);
    expect(day3.employment.board?.positionIds).toEqual(ids1);

    const day8 = fulltimeDayStart(day3, 8, 6 * 60);
    expect(day8.employment.board?.weekStart).toBe(8);
    expect(day8.employment.board?.positionIds.length).toBeGreaterThanOrEqual(FULLTIME.board_min);
  });

  it("excludes a blocked company from the board", () => {
    const blocked = {
      ...base(),
      employment: { ...base().employment, blockedCompanies: { [BE_MIDDLE.company]: 40 } },
    };
    const next = fulltimeDayStart(blocked, 8, 6 * 60);
    const companies = boardPositionsOf(next.employment).map((row) => row.company);
    expect(companies).not.toContain(BE_MIDDLE.company);
  });

  it("hands out company tasks on weekdays only, within the tier count", () => {
    const intern = employed(FE_INTERN.id, 2);
    const weekday = fulltimeDayStart(intern, 2, 6 * 60);
    const tasks = weekday.player_jobs.filter((job) => job.source === "company");
    expect(tasks.length).toBeLessThanOrEqual(FULLTIME.tasks.counts.intern[1] + FULLTIME.tasks.counts.intern[0]);
    for (const task of tasks) {
      expect(task.pay).toBe(0);
      expect(weekday.feed.notices.some((row) => row.payload?.jobId === task.id)).toBe(true);
    }

    const saturday = fulltimeDayStart(employed(FE_INTERN.id, 6), 6, 6 * 60);
    expect(saturday.player_jobs.filter((job) => job.source === "company")).toHaveLength(0);
    const sunday = fulltimeDayStart(employed(FE_INTERN.id, 7), 7, 6 * 60);
    expect(sunday.player_jobs.filter((job) => job.source === "company")).toHaveLength(0);
  });

  it("auto-accepts an untouched company task overnight", () => {
    const state = { ...employed(FE_INTERN.id, 2), player_jobs: [companyJob({ offered_day: 2 })] };
    const next = fulltimeDayStart(state, 3, 6 * 60);
    expect(next.player_jobs.find((job) => job.id === "ctask-2-landing-html-0")).toMatchObject({
      status: "active",
      accepted_day: 2,
    });
    expect(next.feed.notices.some((row) => row.payload?.jobId === "ctask-2-landing-html-0")).toBe(false);
  });
});

describe("company task rewards", () => {
  it("pays no money and no freelance credit, but grants reputation and XP", () => {
    const state = employed(FE_INTERN.id, 2);
    const job = companyJob({
      status: "active",
      accepted_day: 2,
      task_run: {
        step: "test",
        seed: 7,
        ticket: "correct",
        build: "careful",
        event_id: null,
        bugs_total: 0,
        bugs_caught: 0,
        retries: 0,
        outcome: null,
        time_bonus_sec: 0,
      },
    });
    const withJob = { ...state, player_jobs: [job] };
    const done = grantTaskSuccess(withJob, job.id, SIM_CATALOG);
    expect(done.error).toBeNull();
    expect(done.state.players.money).toBe(state.players.money);
    expect(done.state.players.freelance_completed).toBe(0);
    const template = SIM_CATALOG.jobTemplates.find((row) => row.id === job.template_id)!;
    expect(done.state.players.reputation).toBe(state.players.reputation + template.reputation_gain);
    const xpBefore = state.player_skills.reduce((sum, row) => sum + row.xp, 0);
    const xpAfter = done.state.player_skills.reduce((sum, row) => sum + row.xp, 0);
    expect(xpAfter).toBeGreaterThan(xpBefore);
    expect(done.state.player_jobs[0]!.status).toBe("completed");
  });
});

describe("strikes and firing", () => {
  it("charges 5% salary, −1 reputation, and +1 strike for a late task", () => {
    const withRep = { ...employed(BE_MIDDLE.id, 3), players: { ...employed(BE_MIDDLE.id, 3).players, reputation: 5 } };
    const late = addCompanyStrike(withRep, companyJob(), "late");
    expect(late.employment.current?.strikes).toBe(1);
    expect(late.employment.current?.monthPenalty).toBe(500_000);
    expect(late.employment.current?.lateTasks).toBe(1);
    expect(late.players.reputation).toBe(4);
    expect(late.feed.notices.some((row) => row.id.startsWith("ft-late-"))).toBe(true);
  });

  it("warns at strike two and fires at strike three", () => {
    const warned = addCompanyStrike(employed(BE_MIDDLE.id, 3, { strikes: 1 }), companyJob(), "late");
    expect(warned.employment.current?.strikes).toBe(2);
    expect(warned.feed.notices.some((row) => row.id === "ft-warn-3")).toBe(true);

    const withTask = { ...employed(BE_MIDDLE.id, 3, { strikes: 2 }), player_jobs: [companyJob({ status: "active" })] };
    const fired = addCompanyStrike(withTask, companyJob({ status: "active" }), "late");
    expect(fired.employment.current).toBeNull();
    expect(fired.employment.fired).toMatchObject({ company: BE_MIDDLE.company, open: true, days: 10, lateTasks: 1 });
    expect(fired.employment.blockedCompanies[BE_MIDDLE.company]).toBe(3 + FULLTIME.block_days);
    expect(fired.player_jobs[0]!.status).toBe("fired");
    expect(fired.players.mood).toBe(60);
    expect(fired.players.reputation).toBeGreaterThanOrEqual(0);
  });

  it("pays the remaining salary when the firing popup closes", () => {
    const withTask = { ...employed(BE_MIDDLE.id, 3, { strikes: 2 }), player_jobs: [companyJob({ status: "active" })] };
    const fired = addCompanyStrike(withTask, companyJob({ status: "active" }), "late");
    const payout = fired.employment.fired!.payout;
    expect(payout).toBe(Math.max(0, Math.round((10_000_000 * 10) / 28) - 500_000));
    const closed = closeFiredPopup(fired);
    expect(closed.state.employment.fired).toBeNull();
    expect(closed.state.players.money).toBe(fired.players.money + payout);
  });

  it("routes a missed company deadline through the strike path", () => {
    const state = {
      ...employed(BE_MIDDLE.id, 4),
      player_jobs: [companyJob({ status: "active", accepted_day: 2, deadline_day: 2, offered_day: 2 })],
    };
    const next = applyJobDeadlines(state, 4, 8 * 60);
    expect(next.player_jobs[0]!.status).toBe("failed");
    expect(next.employment.current?.strikes).toBe(1);
    expect(next.employment.current?.monthPenalty).toBe(500_000);
    expect(next.players.mood).toBe(state.players.mood);
  });
});

describe("payday", () => {
  it("pays pro-rata minus penalty once, then cleans a strike-free month", () => {
    // Day 28 is the last day of month 1.
    const state = employed(BE_MIDDLE.id, 28, {
      salary: 14_000_000,
      daysWorkedThisMonth: 14,
      monthPenalty: 700_000,
      strikes: 1,
    });
    expect(paydayDue(state, 28)).toBe(true);
    const paid = settlePayday(state, 28, 18 * 60);
    expect(paid.players.money).toBe(state.players.money + (14_000_000 / 2 - 700_000));
    expect(paid.players.mood).toBe(state.players.mood + FULLTIME.payday_mood);
    expect(paid.employment.current).toMatchObject({
      daysWorkedThisMonth: 0,
      monthPenalty: 0,
      strikes: 0,
    });
    expect(paid.employment.lastPaydayKey).toBe(monthKey(28));
    expect(paid.feed.notices.some((row) => row.id === `ft-payday-${monthKey(28)}`)).toBe(true);

    // No double pay at the day-1 fallback.
    expect(paydayDue(paid, 28)).toBe(false);
    const again = fulltimeDayStart(paid, 29, 6 * 60);
    expect(again.players.money).toBe(paid.players.money);
    expect(again.employment.current?.countedMonthKey).toBe(monthKey(29));
  });

  it("pays a quit job's accrued salary at that month's payday", () => {
    const state = {
      ...base({ day: 28 }),
      employment: {
        ...base().employment,
        pendingPayouts: [{ company: "PixelWeb", amount: 2_500_000, monthKey: monthKey(28) }],
      },
    };
    expect(paydayDue(state, 28)).toBe(true);
    const paid = settlePayday(state, 28, 18 * 60);
    expect(paid.players.money).toBe(state.players.money + 2_500_000);
    expect(paid.employment.pendingPayouts).toHaveLength(0);
    expect(paid.feed.notices.some((row) => row.id.startsWith("ft-payout-"))).toBe(true);
  });
});

describe("freelance pacing while employed", () => {
  it("doubles the notice spacing", () => {
    expect(freelanceNoticeEvery(base())).toBe(LIFE.job_notice_every_slots);
    expect(freelanceNoticeEvery(employed(FE_INTERN.id, 2))).toBe(LIFE.job_notice_every_slots * 2);

    let state = employed(FE_INTERN.id, 2);
    state = tickJobOffers(state, 2, 8 * 60);
    state = tickJobOffers(state, 2, 10 * 60);
    expect(
      state.feed.notices.filter((row) => row.actions?.some((button) => button.id === "acceptJob")),
    ).toHaveLength(0);
    state = tickJobOffers(state, 2, 12 * 60);
    state = tickJobOffers(state, 2, 14 * 60);
    expect(
      state.feed.notices.filter((row) => row.actions?.some((button) => button.id === "acceptJob")),
    ).toHaveLength(1);
  });
});

describe("version 22 migration", () => {
  it("starts employment empty and keeps old jobs freelance", () => {
    const saved = migrateSave(
      {
        stage: "student",
        totalMinutes: 2 * 24 * 60 + 8 * 60,
        career: {
          players: { money: 42 },
          player_skills: [{ skill_id: "frontend", level: 4, xp: 9 }],
          player_jobs: [
            {
              id: "legacy-remote",
              template_id: "frontend-remote",
              job_type: "remote",
              status: "offered",
              offered_day: 1,
            },
            {
              id: "company-row",
              template_id: "landing-html",
              job_type: "freelance",
              source: "company",
              status: "active",
              offered_day: 1,
            },
          ],
          employment: {
            current: { positionId: "fe-junior-caphencode", company: "Cà Phê Code", salary: 10_500_000 },
            applications: [{ id: "app-1-x", positionId: "fe-junior-caphencode", appliedDay: 1, weekStart: 1 }],
          },
        },
      },
      21,
    );
    expect(saved.career.player_jobs.find((row) => row.id === "legacy-remote")).toMatchObject({
      job_type: "remote",
      source: "freelance",
      status: "offered",
    });
    expect(saved.career.player_jobs.find((row) => row.id === "company-row")).toMatchObject({
      source: "company",
    });
    expect(saved.career.employment.current).toMatchObject({
      positionId: "fe-junior-caphencode",
      salary: 10_500_000,
    });
    expect(saved.career.employment.applications[0]).toMatchObject({
      id: "app-1-x",
      quotedSalary: 0,
      outcome: "waiting",
    });
  });

  it("hands an older save an empty employment", () => {
    const saved = migrateSave(
      { stage: "student", totalMinutes: 480, career: { players: { money: 42 } } },
      15,
    );
    expect(saved.career.employment).toEqual({
      current: null,
      applications: [],
      board: null,
      blockedCompanies: {},
      pendingPayouts: [],
      fired: null,
      lastPaydayKey: null,
    });
  });
});
