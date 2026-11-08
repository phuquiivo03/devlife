import type { TaskBuildChoice, TaskEventDef, TaskTicketChoice, BugFormula } from "./types";

/** How many bugs the test step spawns. All tuning comes from config. */
export function bugCount(input: {
  skillLevel: number;
  difficulty: number;
  ticket: TaskTicketChoice;
  build: TaskBuildChoice;
  eventBugDelta: number;
  formula: BugFormula;
}): number {
  const step = input.formula.skill_step;
  const skillCuts = step > 0 ? Math.floor(Math.max(0, input.skillLevel - 1) / step) : 0;
  const ticketDelta =
    input.ticket === "wrong"
      ? input.formula.wrong_ticket
      : input.ticket === "ask"
        ? input.formula.ask_ticket
        : input.formula.correct_ticket;
  const buildDelta = input.build === "careful" ? input.formula.careful : input.formula.rushed;
  const raw =
    input.formula.base +
    Math.max(0, input.difficulty - 1) * input.formula.per_difficulty -
    skillCuts +
    ticketDelta +
    buildDelta +
    input.eventBugDelta;
  const min = Math.min(input.formula.min, input.formula.max);
  const max = Math.max(input.formula.min, input.formula.max);
  return Math.max(min, Math.min(max, Math.round(raw)));
}

export function taskSeed(jobId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < jobId.length; i++) {
    hash ^= jobId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function qualitySeed(seed: number, coderId: string, index: number): number {
  const key = `${seed}:coding-quality:${coderId}:${index}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function bugSpots(seed: number, count: number): { x: number; y: number }[] {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const spots: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    spots.push({ x: 8 + rand() * 78, y: 12 + rand() * 68 });
  }
  return spots;
}

/** One shared roll for the build step. Null means the build stays quiet. */
export function rollTaskEvent(
  seed: number,
  chance: number,
  events: readonly TaskEventDef[],
): TaskEventDef | null {
  if (events.length === 0 || chance <= 0) return null;
  const rand = mulberry32(seed);
  if (rand() >= chance) return null;
  const index = Math.min(events.length - 1, Math.floor(rand() * events.length));
  return events[index] ?? null;
}

/** Terminal lines for one build event. A requirement change warns; a bug errors. */
export function taskEventFlash(
  event: Pick<TaskEventDef, "name" | "warning" | "bug_delta">,
  errorText: string,
): { warning: string | null; error: string | null } {
  return {
    warning: event.warning ? `> WARNING: ${event.name}` : null,
    error: event.bug_delta > 0 ? `> ERROR: ${errorText}` : null,
  };
}
