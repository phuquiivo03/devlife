import {
  DEFAULT_START_MINUTES,
  MINUTE_EVENT_COALESCE_AFTER,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  PHASES,
  REAL_MS_PER_GAME_DAY,
  SLEEP_WAKE_MINUTE,
  TIME_PERSIST_VERSION,
  type PhaseDef,
  type PhaseId,
} from "./config";
import type { ClockSnapshot, TimeEvent } from "./types";

export type AdvanceResult = {
  totalMinutes: number;
  events: TimeEvent[];
};

/**
 * Convert a real-time gap into in-game minutes.
 * Multiply before dividing so an exact `REAL_MS_PER_GAME_DAY` gap is an exact
 * 1440-minute day (the precomputed ratio is not a binary fraction).
 */
export function realMsToGameMinutes(realMs: number, speed: number): number {
  if (!(realMs > 0) || !(speed > 0)) return 0;
  return (realMs * speed * MINUTES_PER_DAY) / REAL_MS_PER_GAME_DAY;
}

export function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function phaseById(id: PhaseId): PhaseDef {
  const found = PHASES.find((phase) => phase.id === id);
  if (!found) {
    throw new Error(`Unknown phase: ${id}`);
  }
  return found;
}

export function phaseContains(phase: PhaseDef, minuteOfDay: number): boolean {
  const m = mod(minuteOfDay, MINUTES_PER_DAY);
  if (phase.startMinute < phase.endMinute) {
    return m >= phase.startMinute && m < phase.endMinute;
  }
  return m >= phase.startMinute || m < phase.endMinute;
}

export function phaseAtMinuteOfDay(minuteOfDay: number): PhaseDef {
  const m = mod(Math.floor(minuteOfDay), MINUTES_PER_DAY);
  for (const phase of PHASES) {
    if (phaseContains(phase, m)) return phase;
  }
  return PHASES[PHASES.length - 1]!;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function sanitize(totalMinutes: number): number {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return 0;
  return totalMinutes;
}

export function snapshot(totalMinutes: number): ClockSnapshot {
  const safe = sanitize(totalMinutes);
  const whole = Math.floor(safe);
  const minuteOfDay = whole % MINUTES_PER_DAY;
  const hour = Math.floor(minuteOfDay / MINUTES_PER_HOUR);
  const minute = minuteOfDay % MINUTES_PER_HOUR;
  return {
    totalMinutes: safe,
    day: Math.floor(whole / MINUTES_PER_DAY) + 1,
    hour,
    minute,
    minuteOfDay,
    phaseId: phaseAtMinuteOfDay(minuteOfDay).id,
    clockLabel: formatClock(hour, minute),
  };
}

export function canSleepAt(totalMinutes: number): boolean {
  return phaseAtMinuteOfDay(snapshot(totalMinutes).minuteOfDay).sleepAllowed;
}

/**
 * v1 saves have no clock. Missing or non-finite values also fall back so a
 * corrupt write cannot wedge the loop.
 */
export function totalMinutesFromPersisted(value: unknown, version: number): number {
  if (
    version >= TIME_PERSIST_VERSION &&
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return value;
  }
  return DEFAULT_START_MINUTES;
}

function pushArrival(events: TimeEvent[], absoluteMinute: number, count: number): void {
  const snap = snapshot(absoluteMinute);
  const prev = snapshot(absoluteMinute - 1);
  events.push({
    type: "minute",
    totalMinutes: absoluteMinute,
    day: snap.day,
    hour: snap.hour,
    minute: snap.minute,
    count,
  });
  if (snap.day !== prev.day || snap.hour !== prev.hour) {
    events.push({
      type: "hourChanged",
      day: snap.day,
      hour: snap.hour,
      totalMinutes: absoluteMinute,
    });
  }
  if (snap.phaseId !== prev.phaseId) {
    events.push({
      type: "phaseChanged",
      phase: snap.phaseId,
      previous: prev.phaseId,
      day: snap.day,
      totalMinutes: absoluteMinute,
    });
  }
  if (snap.day !== prev.day) {
    events.push({
      type: "dayStarted",
      day: snap.day,
      totalMinutes: absoluteMinute,
    });
  }
}

/** Next hour mark strictly after `absoluteMinute`. */
function nextHourAfter(absoluteMinute: number): number {
  const modHour = absoluteMinute % MINUTES_PER_HOUR;
  if (modHour === 0) return absoluteMinute + MINUTES_PER_HOUR;
  return absoluteMinute + (MINUTES_PER_HOUR - modHour);
}

/**
 * Move the clock forward by `deltaMinutes`.
 * Boundary events fire for every hour, phase, and day crossed, including when
 * the delta spans a background-tab catch-up or a fast-forward.
 */
export function advanceMinutes(totalMinutes: number, deltaMinutes: number): AdvanceResult {
  const from = sanitize(totalMinutes);
  if (!Number.isFinite(deltaMinutes) || deltaMinutes <= 0) {
    return { totalMinutes: from, events: [] };
  }
  const next = from + deltaMinutes;
  const startFloor = Math.floor(from);
  const endFloor = Math.floor(next);
  if (endFloor <= startFloor) {
    return { totalMinutes: next, events: [] };
  }

  const events: TimeEvent[] = [];
  const span = endFloor - startFloor;
  if (span <= MINUTE_EVENT_COALESCE_AFTER) {
    for (let minute = startFloor + 1; minute <= endFloor; minute += 1) {
      pushArrival(events, minute, 1);
    }
  } else {
    let cursor = startFloor;
    while (cursor < endFloor) {
      const boundary = Math.min(endFloor, nextHourAfter(cursor));
      if (boundary <= cursor) break;
      pushArrival(events, boundary, boundary - cursor);
      cursor = boundary;
    }
  }

  return { totalMinutes: next, events };
}

function pushDestinationDiff(events: TimeEvent[], from: number, to: number): void {
  const before = snapshot(from);
  const after = snapshot(to);
  if (after.day !== before.day || after.hour !== before.hour) {
    events.push({
      type: "hourChanged",
      day: after.day,
      hour: after.hour,
      totalMinutes: to,
    });
  }
  if (after.phaseId !== before.phaseId) {
    events.push({
      type: "phaseChanged",
      phase: after.phaseId,
      previous: before.phaseId,
      day: after.day,
      totalMinutes: to,
    });
  }
  if (after.day !== before.day) {
    events.push({
      type: "dayStarted",
      day: after.day,
      totalMinutes: to,
    });
  }
}

/**
 * Skip to 06:00 on the next day. Sleeping past midnight (00:00–05:59) lands at
 * 06:00 of the current day instead — the morning already ahead of the player.
 * Does not emit a `minute` per skipped minute — listeners that care about rest
 * subscribe to `sleep`.
 */
export function sleepToNextMorning(totalMinutes: number): AdvanceResult {
  const from = sanitize(totalMinutes);
  const snap = snapshot(from);
  const dayIndex = snap.minuteOfDay < SLEEP_WAKE_MINUTE ? snap.day - 1 : snap.day;
  const wake = dayIndex * MINUTES_PER_DAY + SLEEP_WAKE_MINUTE;
  const events: TimeEvent[] = [];
  pushDestinationDiff(events, from, wake);
  events.push({
    type: "sleep",
    fromTotalMinutes: from,
    toTotalMinutes: wake,
    day: snapshot(wake).day,
  });
  return { totalMinutes: wake, events };
}

/** Absolute minute at the start of `phaseId` on the same in-game day. */
export function minutesForPhaseStart(totalMinutes: number, phaseId: PhaseId): number {
  const safe = sanitize(totalMinutes);
  const dayIndex = Math.floor(safe / MINUTES_PER_DAY);
  return dayIndex * MINUTES_PER_DAY + phaseById(phaseId).startMinute;
}

/**
 * Dev seek. Forward seeks replay boundary events via `advanceMinutes`.
 * Backward seeks teleport and emit only the hour/phase/day diffs.
 */
export function seekMinutes(fromMinutes: number, toMinutes: number): AdvanceResult {
  const from = sanitize(fromMinutes);
  const to = sanitize(toMinutes);
  if (to === from) return { totalMinutes: from, events: [] };
  if (to > from) return advanceMinutes(from, to - from);
  const events: TimeEvent[] = [];
  pushDestinationDiff(events, from, to);
  return { totalMinutes: to, events };
}
