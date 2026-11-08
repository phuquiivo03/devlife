import { TASK_RUN } from "./content";
import type { TaskBuildChoice, TaskRun, TaskTicketChoice } from "./types";

export function buildPreChoiceSec(
  timeScale: number,
  ticket: TaskTicketChoice | null,
  eventTimeDelta: number,
): number {
  return Math.max(
    1,
    TASK_RUN.build_sec * timeScale +
      (ticket === "ask" ? TASK_RUN.ask_extra_sec : 0) +
      eventTimeDelta,
  );
}

export function buildBaseSec(
  run: Pick<TaskRun, "ticket" | "build" | "time_bonus_sec" | "event_id">,
  timeScale: number,
  events: readonly { id: string; time_delta_sec: number }[],
): number {
  const event = run.event_id ? events.find((row) => row.id === run.event_id) : null;
  const pre = buildPreChoiceSec(timeScale, run.ticket, (event?.time_delta_sec ?? 0) + run.time_bonus_sec);
  if (!run.build) return pre;
  const delta =
    run.build === "careful" ? TASK_RUN.careful_extra_sec : TASK_RUN.rushed_extra_sec;
  return Math.max(1.2, pre * (1 - TASK_RUN.choice_at) + delta);
}

export function buildRemainingSec(
  run: TaskRun,
  timeScale: number,
  events: readonly { id: string; time_delta_sec: number }[],
): number {
  const total = buildBaseSec(run, timeScale, events);
  const m = run.build_runner === "agent" && run.coder ? run.coder.time_multiplier : 1;
  return Math.max(0, total * m * (1 - run.build_progress));
}

export function agentFixTotalSec(timeScale: number, m: number): number {
  return TASK_RUN.test_sec * timeScale * m;
}

export function manualBudgetSec(timeScale: number): number {
  return TASK_RUN.test_sec * timeScale;
}

export function retryEnergyCost(
  baseRetry: number,
  jobEnergyFactor: number,
  workStreak: number,
  energyCostFn: (base: number, streak: number) => number,
): number {
  return energyCostFn(baseRetry * jobEnergyFactor, workStreak);
}

export function speedLabel(m: number): string {
  const faster = m < 1;
  const pct = Math.round(Math.abs(1 - m) * 100);
  return faster ? `×${m.toFixed(2)} (nhanh hơn ~${pct}%)` : `×${m.toFixed(2)} (chậm hơn ~${pct}%)`;
}
