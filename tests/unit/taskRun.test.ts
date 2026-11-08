import { describe, expect, it } from "vitest";
import { SIM_CATALOG } from "@/game/career/content";
import { jobPay } from "@/game/life/logic";
import { defaultCareer, ensureTodayBoard } from "@/game/career/actions";
import { jobEligibility, skillNameMap } from "@/game/jobs/logic";
import {
  beginTest,
  catchBug,
  chooseBuild,
  chooseTicket,
  commitTask,
  finishTest,
  retryTask,
  startTask,
} from "@/game/task-run/apply";
import { TASK_RUN } from "@/game/task-run/content";
import { bugCount, rollTaskEvent, taskEventFlash } from "@/game/task-run/formula";
import { canRetry, isCleared } from "@/game/task-run/machine";
import { bugHitPx, spawnBugs, stepBug } from "@/game/task-run/motion";

const formula = TASK_RUN.bugs;

describe("bug formula", () => {
  it("stays inside the configured min and max", () => {
    const low = bugCount({
      skillLevel: 10,
      difficulty: 1,
      ticket: "correct",
      build: "careful",
      eventBugDelta: 0,
      formula,
    });
    const high = bugCount({
      skillLevel: 1,
      difficulty: 3,
      ticket: "wrong",
      build: "rushed",
      eventBugDelta: 4,
      formula,
    });
    expect(low).toBe(formula.min);
    expect(high).toBe(formula.max);
  });

  it("raises the count for a wrong ticket and a rushed build", () => {
    const careful = bugCount({
      skillLevel: 1,
      difficulty: 1,
      ticket: "correct",
      build: "careful",
      eventBugDelta: 0,
      formula,
    });
    const wrongRush = bugCount({
      skillLevel: 1,
      difficulty: 1,
      ticket: "wrong",
      build: "rushed",
      eventBugDelta: 0,
      formula,
    });
    expect(wrongRush).toBeGreaterThan(careful);
  });

  it("treats asking the client as safe", () => {
    const asked = bugCount({
      skillLevel: 1,
      difficulty: 1,
      ticket: "ask",
      build: "careful",
      eventBugDelta: 0,
      formula,
    });
    const correct = bugCount({
      skillLevel: 1,
      difficulty: 1,
      ticket: "correct",
      build: "careful",
      eventBugDelta: 0,
      formula,
    });
    expect(asked).toBe(correct);
  });

  it("drops bugs as the skill level rises", () => {
    const junior = bugCount({
      skillLevel: 1,
      difficulty: 2,
      ticket: "correct",
      build: "rushed",
      eventBugDelta: 0,
      formula,
    });
    const senior = bugCount({
      skillLevel: 1 + formula.skill_step,
      difficulty: 2,
      ticket: "correct",
      build: "rushed",
      eventBugDelta: 0,
      formula,
    });
    expect(senior).toBeLessThan(junior);
  });
});

describe("task run state machine", () => {
  function openJob() {
    const start = defaultCareer(1, 480, "student", SIM_CATALOG);
    const board = ensureTodayBoard(start, 1, SIM_CATALOG);
    const names = skillNameMap(SIM_CATALOG.skills);
    const job = board.state.player_jobs.find((row) => {
      const template = SIM_CATALOG.jobTemplates.find((item) => item.id === row.template_id);
      if (!template || row.status !== "offered") return false;
      return jobEligibility(
        start.players,
        start.player_skills,
        template,
        SIM_CATALOG.jobTemplateRequirements.filter((req) => req.template_id === template.id),
        names,
      ).ok;
    });
    if (!job) throw new Error("no open job");
    return { state: board.state, job };
  }

  it("does not pay until the bugs are caught", () => {
    const { state, job } = openJob();
    const started = startTask(state, job.id, SIM_CATALOG);
    expect(started.error).toBeNull();
    expect(started.state.players.money).toBe(state.players.money);
    expect(started.state.player_jobs.find((row) => row.id === job.id)?.status).toBe("active");
    expect(started.events.map((event) => event.type)).toEqual([
      "jobAccepted",
      "taskStarted",
      "energyChanged",
    ]);
  });

  it("fails when a bug escapes, allows one retry, then drops reputation", () => {
    const { state, job } = openJob();
    const started = startTask(state, job.id, SIM_CATALOG);
    const ticket = chooseTicket(started.state, job.id, "wrong", SIM_CATALOG);
    const built = chooseBuild(ticket.state, job.id, "rushed", SIM_CATALOG);
    const testing = beginTest(built.state, job.id);
    const run = testing.state.player_jobs.find((row) => row.id === job.id)?.task_run;
    expect(run?.bugs_total).toBeGreaterThan(0);
    expect(isCleared(run!)).toBe(false);

    const first = finishTest(testing.state, job.id, SIM_CATALOG);
    const afterFirst = first.state.player_jobs.find((row) => row.id === job.id);
    expect(afterFirst?.status).toBe("active");
    expect(afterFirst?.task_run && canRetry(afterFirst.task_run, TASK_RUN.max_retries)).toBe(true);
    expect(first.state.players.money).toBe(started.state.players.money);
    expect(first.state.players.reputation).toBe(0);
    expect(first.events.some((event) => event.type === "bugEscaped")).toBe(true);

    const again = retryTask(first.state, job.id, SIM_CATALOG);
    expect(again.error).toBeNull();
    expect(again.state.players.energy).toBe(first.state.players.energy - TASK_RUN.retry_energy);
    expect(again.events.some((event) => event.type === "taskRetried")).toBe(true);

    const withRep = {
      ...again.state,
      players: { ...again.state.players, reputation: 4 },
    };
    const second = finishTest(withRep, job.id, SIM_CATALOG);
    const failed = second.state.player_jobs.find((row) => row.id === job.id);
    expect(failed?.status).toBe("failed");
    expect(second.state.players.money).toBe(started.state.players.money);
    expect(second.state.players.reputation).toBe(4 - TASK_RUN.fail_reputation);
    expect(second.events).toContainEqual(
      expect.objectContaining({
        type: "taskFailed",
        final: true,
        reputationDelta: -TASK_RUN.fail_reputation,
      }),
    );

    const blocked = retryTask(second.state, job.id, SIM_CATALOG);
    expect(blocked.error).toBe("Hết lượt làm lại");
  });

  it("pays, grants job XP, and emits success when every bug is caught", () => {
    const { state, job } = openJob();
    const template = SIM_CATALOG.jobTemplates.find((row) => row.id === job.template_id)!;
    let cursor = startTask(
      { ...state, players: { ...state.players, freelance_completed: 9, reputation: 2 } },
      job.id,
      SIM_CATALOG,
    );
    cursor = chooseTicket(cursor.state, job.id, "correct", SIM_CATALOG);
    cursor = chooseBuild(cursor.state, job.id, "careful", SIM_CATALOG);
    cursor = beginTest(cursor.state, job.id);
    const total = cursor.state.player_jobs.find((row) => row.id === job.id)?.task_run?.bugs_total ?? 0;
    for (let i = 0; i < total; i++) {
      const step = catchBug(cursor.state, job.id, SIM_CATALOG);
      cursor = { ...cursor, state: step.state, events: [...cursor.events, ...step.events] };
    }
    cursor = finishTest(cursor.state, job.id, SIM_CATALOG);
    const readyRun = cursor.state.player_jobs.find((row) => row.id === job.id)?.task_run;
    expect(readyRun?.step).toBe("ready");
    expect(cursor.state.player_jobs.find((row) => row.id === job.id)?.status).toBe("active");
    cursor = commitTask(cursor.state, job.id, SIM_CATALOG, readyRun!.revision);
    const done = cursor.state.player_jobs.find((row) => row.id === job.id);
    expect(done?.status).toBe("completed");
    expect(done?.bugs).toBe(0);
    expect(cursor.state.players.money).toBe(
      state.players.money + jobPay(template.pay, template.tier, 2),
    );
    expect(cursor.state.players.freelance_completed).toBe(10);
    expect(cursor.state.players.reputation).toBe(2 + template.reputation_gain);
    expect(cursor.events.some((event) => event.type === "taskSucceeded")).toBe(true);
    expect(cursor.events.some((event) => event.type === "moneyChanged")).toBe(true);
    expect(cursor.state.player_unlocks.map((row) => row.milestone_id)).toContain("freelance-10");
  });

  it("spawns three sizes by weight, with small fastest and large slowest", () => {
    const motion = TASK_RUN.bug_motion;
    expect(motion.sizes.small.px).toBeLessThan(motion.sizes.medium.px);
    expect(motion.sizes.medium.px).toBeLessThan(motion.sizes.large.px);
    expect(motion.sizes.small.speed).toBeGreaterThan(motion.sizes.medium.speed);
    expect(motion.sizes.medium.speed).toBeGreaterThan(motion.sizes.large.speed);
    expect(motion.sizes.small.turn_ms).toBeLessThan(motion.sizes.medium.turn_ms);
    expect(motion.sizes.medium.turn_ms).toBeLessThan(motion.sizes.large.turn_ms);
    expect(bugHitPx(motion)).toBeGreaterThanOrEqual(44);

    const count = 4000;
    const bugs = spawnBugs(7, count, motion);
    expect(spawnBugs(7, count, motion)).toEqual(bugs);
    const tally = { small: 0, medium: 0, large: 0 };
    for (const bug of bugs) tally[bug.size] += 1;
    expect(tally.small / count).toBeCloseTo(motion.sizes.small.weight, 1);
    expect(tally.medium / count).toBeCloseTo(motion.sizes.medium.weight, 1);
    expect(tally.large / count).toBeCloseTo(motion.sizes.large.weight, 1);

    const start = { size: "small" as const, x: 50, y: 50, angle: 0, untilTurn: 10_000 };
    const fast = stepBug(start, 1000, motion, () => 0, false);
    const slow = stepBug(start, 1000, motion, () => 0, true);
    expect(fast.x).toBeCloseTo(50 + motion.sizes.small.speed, 5);
    expect(slow.x).toBeCloseTo(50 + motion.sizes.small.speed * motion.reduced_motion_scale, 5);
    expect(slow.x).toBeGreaterThan(start.x);

    const turned = stepBug({ ...start, untilTurn: 10 }, 20, motion, () => 0.25, false);
    expect(turned.angle).toBeCloseTo(Math.PI / 2, 5);
    expect(turned.untilTurn).toBe(motion.sizes.small.turn_ms);
    const turnedSlow = stepBug({ ...start, untilTurn: 10 }, 20, motion, () => 0.25, true);
    expect(turnedSlow.untilTurn).toBeCloseTo(motion.sizes.small.turn_ms / motion.reduced_motion_scale, 5);

    const bounced = stepBug({ ...start, x: 90, untilTurn: 5000 }, 1000, motion, () => 0, false);
    expect(bounced.x).toBe(100 - motion.inset);
    expect(bounced.angle).toBeCloseTo(Math.PI, 5);
  });

  it("rolls the same event for the same seed", () => {
    const once = rollTaskEvent(42, 1, TASK_RUN.events);
    const twice = rollTaskEvent(42, 1, TASK_RUN.events);
    expect(once?.id).toBe(twice?.id);
    expect(rollTaskEvent(42, 0, TASK_RUN.events)).toBeNull();
  });
});

describe("task event lines", () => {
  it("warns on a requirement change and errors when the event adds a bug", () => {
    expect(TASK_RUN.terminal_warn_blinks).toBe(3);
    expect(TASK_RUN.terminal_error_blinks).toBe(3);
    expect(TASK_RUN.error_text).toBe("có bug");
    for (const event of TASK_RUN.events) {
      const flash = taskEventFlash(event, TASK_RUN.error_text);
      expect(flash.warning != null || flash.error != null).toBe(true);
    }
    const scope = TASK_RUN.events.find((event) => event.id === "scope");
    const offline = TASK_RUN.events.find((event) => event.id === "offline");
    const womm = TASK_RUN.events.find((event) => event.id === "womm");
    expect(taskEventFlash(scope!, TASK_RUN.error_text)).toEqual({
      warning: "> WARNING: Khách đổi yêu cầu",
      error: "> ERROR: có bug",
    });
    expect(taskEventFlash(offline!, TASK_RUN.error_text)).toEqual({
      warning: "> WARNING: Mất mạng",
      error: null,
    });
    expect(taskEventFlash(womm!, TASK_RUN.error_text)).toEqual({
      warning: null,
      error: "> ERROR: có bug",
    });
  });
});
