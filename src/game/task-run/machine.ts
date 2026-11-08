import type { TaskBuildChoice, TaskRun, TaskTicketChoice } from "./types";

export const TASK_RUN_DEFAULTS = {
  revision: 0,
  start_paid: false,
  force: false,
  mode: null as TaskRun["mode"],
  coder: null,
  build_runner: "manual" as const,
  build_progress: 0,
  potential_bugs: 0,
  bug_ids: [] as string[],
  fixed_bug_ids: [] as string[],
  fix_partial: null,
  fixer_id: null,
  manual_left_sec: null as number | null,
};

export function freshRun(seed: number): TaskRun {
  return {
    step: "select",
    seed,
    ticket: null,
    build: null,
    event_id: null,
    bugs_total: 0,
    bugs_caught: 0,
    retries: 0,
    outcome: null,
    time_bonus_sec: 0,
    ...TASK_RUN_DEFAULTS,
  };
}

export function bumpRevision(run: TaskRun): TaskRun {
  return { ...run, revision: run.revision + 1 };
}

export function syncBugCounters(run: TaskRun): TaskRun {
  if (run.bug_ids.length > 0) {
    return {
      ...run,
      bugs_total: run.bug_ids.length,
      bugs_caught: run.fixed_bug_ids.length,
    };
  }
  return run;
}

export function applyTicketChoice(
  run: TaskRun,
  choice: TaskTicketChoice,
  eventId: string | null,
  extraSec: number,
): TaskRun {
  return bumpRevision({
    ...run,
    step: "build",
    ticket: choice,
    event_id: eventId,
    time_bonus_sec: extraSec,
    outcome: null,
  });
}

export function applyBuildChoice(
  run: TaskRun,
  choice: TaskBuildChoice,
  bugsTotal: number,
  timeDeltaSec: number,
): TaskRun {
  const bug_ids = Array.from({ length: bugsTotal }, (_, i) => `b${i}`);
  return bumpRevision(
    syncBugCounters({
      ...run,
      build: choice,
      bugs_total: bugsTotal,
      bugs_caught: 0,
      potential_bugs: bugsTotal,
      bug_ids,
      fixed_bug_ids: [],
      time_bonus_sec: run.time_bonus_sec + timeDeltaSec,
    }),
  );
}

export function applyBeginTest(run: TaskRun): TaskRun {
  return bumpRevision(syncBugCounters({ ...run, step: "test", outcome: null }));
}

export function applyCatch(run: TaskRun, bugId?: string): TaskRun {
  if (run.step !== "test") return run;
  const ids = run.bug_ids.length > 0 ? run.bug_ids : [];
  if (ids.length === 0) {
    return syncBugCounters({
      ...run,
      bugs_caught: Math.min(run.bugs_total, run.bugs_caught + 1),
    });
  }
  if (bugId && run.fixed_bug_ids.includes(bugId)) return run;
  const target = bugId ?? ids.find((id) => !run.fixed_bug_ids.includes(id));
  if (!target) return run;
  const fixed_bug_ids = [...run.fixed_bug_ids, target];
  const next = bumpRevision(
    syncBugCounters({
      ...run,
      fixed_bug_ids,
      fix_partial: run.fix_partial?.bug_id === target ? null : run.fix_partial,
    }),
  );
  if (isCleared(next)) {
    return { ...next, step: "ready", outcome: null };
  }
  return next;
}

export function isCleared(run: TaskRun): boolean {
  if (run.bug_ids.length > 0) {
    return run.fixed_bug_ids.length >= run.bug_ids.length;
  }
  return run.bugs_total > 0 && run.bugs_caught >= run.bugs_total;
}

export function applyTestFail(run: TaskRun): TaskRun {
  const total = run.bug_ids.length > 0 ? run.bug_ids.length : run.bugs_total;
  const caught = run.bug_ids.length > 0 ? run.fixed_bug_ids.length : run.bugs_caught;
  const escaped = Math.max(0, total - caught);
  return bumpRevision(
    syncBugCounters({
      ...run,
      step: "result",
      outcome: "fail",
      bugs_caught: caught,
    }),
  );
}

export function applyRetry(run: TaskRun, anyAgentOwned: boolean): TaskRun {
  return bumpRevision({
    ...run,
    step: anyAgentOwned ? "bug_choice" : "test",
    outcome: null,
    manual_left_sec: null,
    fixer_id: null,
    fix_partial: null,
    retries: run.retries + 1,
  });
}

export function canRetry(run: TaskRun, maxRetries: number): boolean {
  return run.step === "result" && run.outcome === "fail" && run.retries < maxRetries;
}

export function remainingFixWork(run: TaskRun): number {
  const total = run.bug_ids.length;
  if (total === 0) return 0;
  const weight = 1 / total;
  let done = run.fixed_bug_ids.length * weight;
  if (run.fix_partial) {
    done += weight * (1 - run.fix_partial.left);
  }
  return Math.max(0, 1 - done);
}
