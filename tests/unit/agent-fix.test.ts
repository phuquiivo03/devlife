import { describe, expect, it } from "vitest";
import { defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import type { CareerState } from "@/game/career/types";
import { freshRun } from "@/game/task-run/machine";
import { remainingFixWork } from "@/game/task-run/machine";
import {
  checkpointAgentFix,
  chooseTaskFixer,
  switchTaskFixerBack,
} from "@/game/task-run/transitions";
import type { TaskRun } from "@/game/task-run/types";

const CAREFUL_SCALE = 1.1;
const COPILOT_M = 1.1;
const TEST_SEC = 10;
const T = TEST_SEC * CAREFUL_SCALE * COPILOT_M;
const TICK = 0.5 / T;

function seedAgentFix(
  bugIds: string[],
  fixed: string[] = [],
  partial: TaskRun["fix_partial"] = null,
  revision = 3,
): { state: CareerState; jobId: string } {
  const base = defaultCareer(3, 480, "student", SIM_CATALOG);
  const run: TaskRun = {
    ...freshRun(1),
    step: "agent_fix",
    fixer_id: "copilot_inspired",
    bug_ids: bugIds,
    fixed_bug_ids: fixed,
    fix_partial: partial,
    revision,
  };
  const state = {
    ...base,
    agents: {
      owned: ["copilot_inspired"],
      licenses: { copilot_inspired: { bought_day: 3, expires_day: 31 } },
    },
    player_jobs: [
      {
        id: "j",
        template_id: "landing-html",
        job_type: "freelance",
        source: "freelance",
        status: "active",
        hours_required: 2,
        progress_hours: 0,
        bugs: bugIds.length,
        pay: 1,
        offered_day: 3,
        accepted_day: 3,
        deadline_day: 9,
        finished_day: null,
        missed_days: 0,
        task_run: run,
      } as never,
    ],
  } as CareerState;
  return { state, jobId: "j" };
}

const runOf = (s: CareerState) => s.player_jobs[0]!.task_run!;

describe("checkpointAgentFix", () => {
  it("1 bug: progress updates without revision bump until ready", () => {
    const { state: seeded, jobId } = seedAgentFix(["b1"]);
    let state = seeded;
    const rev0 = runOf(state).revision;
    state = checkpointAgentFix(state, jobId, rev0, TICK).state;
    expect(runOf(state).step).toBe("agent_fix");
    expect(runOf(state).revision).toBe(rev0);
    expect(runOf(state).fixed_bug_ids).toHaveLength(0);
    expect(runOf(state).fix_partial?.left).toBeLessThan(1);

    let ticks = 1;
    while (runOf(state).step === "agent_fix" && ticks < 80) {
      const rev = runOf(state).revision;
      state = checkpointAgentFix(state, jobId, rev, TICK).state;
      ticks += 1;
    }
    expect(runOf(state).step).toBe("ready");
    expect(runOf(state).revision).toBe(rev0 + 1);
    expect(runOf(state).fixed_bug_ids).toEqual(["b1"]);
  });

  it("3 bugs: first tick does not finish", () => {
    const { state, jobId } = seedAgentFix(["b0", "b1", "b2"]);
    const rev = runOf(state).revision;
    const next = checkpointAgentFix(state, jobId, rev, TICK).state;
    const run = runOf(next);
    expect(run.step).toBe("agent_fix");
    expect(run.fixed_bug_ids.length).toBeLessThan(3);
  });

  it("3 bugs: reaches ready when cumulative work >= 1", () => {
    const { state: seeded, jobId } = seedAgentFix(["b0", "b1", "b2"]);
    let state = seeded;
    let ticks = 0;
    while (runOf(state).step === "agent_fix" && ticks < 200) {
      const rev = runOf(state).revision;
      state = checkpointAgentFix(state, jobId, rev, TICK).state;
      ticks += 1;
    }
    expect(runOf(state).step).toBe("ready");
    expect(runOf(state).fixed_bug_ids).toHaveLength(3);
  });

  it("2 of 3 fixed: only one bug worth of work remains", () => {
    const { state: seeded, jobId } = seedAgentFix(["b0", "b1", "b2"], ["b0", "b1"]);
    let state = seeded;
    expect(remainingFixWork(runOf(state))).toBeCloseTo(1 / 3, 5);
    const rev = runOf(state).revision;
    const ticksNeeded = Math.ceil((1 / 3) / TICK) + 2;
    for (let i = 0; i < ticksNeeded && runOf(state).step === "agent_fix"; i++) {
      state = checkpointAgentFix(state, jobId, runOf(state).revision, TICK).state;
    }
    expect(runOf(state).step).toBe("ready");
    expect(runOf(state).revision).toBe(rev + 1);
  });

  it("ignores stale revision", () => {
    const { state, jobId } = seedAgentFix(["b1"]);
    const stale = checkpointAgentFix(state, jobId, runOf(state).revision - 1, 1);
    expect(stale.state).toBe(state);
  });

  it("switch fixer mid-fix preserves partial progress", () => {
    const { state: seeded, jobId } = seedAgentFix(["b0", "b1"]);
    let state = seeded;
    const rev = runOf(state).revision;
    state = checkpointAgentFix(state, jobId, rev, TICK).state;
    const partial = runOf(state).fix_partial;
    const fixed = [...runOf(state).fixed_bug_ids];
    state = switchTaskFixerBack(state, jobId, runOf(state).revision).state;
    expect(runOf(state).step).toBe("bug_choice");
    const picked = chooseTaskFixer(
      state,
      jobId,
      runOf(state).revision,
      "copilot_inspired",
    ).state;
    const run = runOf(picked);
    expect(run.step).toBe("agent_fix");
    expect(run.fixed_bug_ids).toEqual(fixed);
    if (partial) expect(run.fix_partial).toEqual(partial);
  });
});
