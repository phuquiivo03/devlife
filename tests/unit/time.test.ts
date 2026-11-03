import { describe, expect, it } from "vitest";
import { resolveShippedIcon } from "@/lib/pixel-assets";
import { listUiIconFiles } from "@/lib/ui-icon-files";
import {
  advanceMinutes,
  canSleepAt,
  createTimeBus,
  createTimeLoop,
  DEFAULT_START_MINUTES,
  formatClock,
  MINUTE_EVENT_COALESCE_AFTER,
  MINUTES_PER_DAY,
  PHASES,
  phaseAtMinuteOfDay,
  REAL_MS_PER_GAME_DAY,
  realMsToGameMinutes,
  seekMinutes,
  sleepToNextMorning,
  snapshot,
  totalMinutesFromPersisted,
  type TimeEvent,
} from "@/game/time";

function ofType<T extends TimeEvent["type"]>(events: TimeEvent[], type: T) {
  return events.filter((event) => event.type === type) as Extract<TimeEvent, { type: T }>[];
}

/** Naive minute walk used as the oracle for boundary events. */
function boundaryOracle(from: number, toFloor: number) {
  const phases: string[] = [];
  const hours: number[] = [];
  const days: number[] = [];
  const start = Math.floor(from);
  for (let minute = start + 1; minute <= toFloor; minute += 1) {
    const prev = snapshot(minute - 1);
    const cur = snapshot(minute);
    if (cur.phaseId !== prev.phaseId) phases.push(cur.phaseId);
    if (cur.hour !== prev.hour || cur.day !== prev.day) hours.push(cur.hour);
    if (cur.day !== prev.day) days.push(cur.day);
  }
  return { phases, hours, days, span: toFloor - start };
}

describe("phase icon lookup", () => {
  it("uses morning/noon/evening/night and swaps the placeholder when the pngs exist", () => {
    expect(PHASES.map((phase) => phase.id)).toEqual(["morning", "noon", "evening", "night"]);
    expect(PHASES.map((phase) => phase.iconKey)).toEqual(["morning", "noon", "evening", "night"]);

    for (const phase of PHASES) {
      expect(resolveShippedIcon(phase.iconKey, 22, [])).toBeNull();
      expect(resolveShippedIcon(phase.iconKey, 22, [`icon_${phase.iconKey}.png`])).toEqual({
        src: `/ui/icons/icon_${phase.iconKey}.png`,
        displayPx: 22,
      });
      expect(
        resolveShippedIcon(phase.iconKey, 22, [
          `icon_${phase.iconKey}.png`,
          `icon_${phase.iconKey}_x4.png`,
        ]),
      ).toEqual({
        src: `/ui/icons/icon_${phase.iconKey}_x4.png`,
        displayPx: 22,
      });
    }
  });

  it("renders the committed phase pngs at an integer HUD scale", () => {
    const files = listUiIconFiles();
    for (const key of ["morning", "noon", "evening", "night"] as const) {
      expect(files).toContain(`icon_${key}.png`);
      expect(files).toContain(`icon_${key}_x4.png`);
      const asset = resolveShippedIcon(key, 22, files);
      expect(asset).toEqual({
        src: `/ui/icons/icon_${key}_x4.png`,
        displayPx: 22,
      });
      expect(176 % asset!.displayPx).toBe(0);
    }
  });
});

describe("clock snapshot", () => {
  it("uses a 10 real-minute day", () => {
    expect(REAL_MS_PER_GAME_DAY).toBe(10 * 60 * 1000);
    expect(realMsToGameMinutes(REAL_MS_PER_GAME_DAY, 1)).toBe(MINUTES_PER_DAY);
    expect(realMsToGameMinutes(REAL_MS_PER_GAME_DAY / 60, 60)).toBe(MINUTES_PER_DAY);
  });

  it("formats HH:MM and derives day 1 at 08:00", () => {
    expect(formatClock(8, 0)).toBe("08:00");
    expect(formatClock(0, 5)).toBe("00:05");
    const snap = snapshot(DEFAULT_START_MINUTES);
    expect(snap).toMatchObject({
      day: 1,
      hour: 8,
      minute: 0,
      phaseId: "morning",
      clockLabel: "08:00",
    });
  });

  it("rolls the day at midnight", () => {
    expect(snapshot(MINUTES_PER_DAY)).toMatchObject({
      day: 2,
      hour: 0,
      minute: 0,
      phaseId: "night",
      clockLabel: "00:00",
    });
    expect(snapshot(MINUTES_PER_DAY + 90.9)).toMatchObject({
      day: 2,
      hour: 1,
      minute: 30,
    });
  });

  it("partitions the day into the four phases", () => {
    const seen = new Map<string, number>();
    for (let minute = 0; minute < MINUTES_PER_DAY; minute += 1) {
      const hits = PHASES.filter((phase) => {
        const id = phaseAtMinuteOfDay(minute).id;
        return id === phase.id;
      });
      expect(hits).toHaveLength(1);
      const id = hits[0]!.id;
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    expect(phaseAtMinuteOfDay(6 * 60 - 1).id).toBe("night");
    expect(phaseAtMinuteOfDay(6 * 60).id).toBe("morning");
    expect(phaseAtMinuteOfDay(12 * 60 - 1).id).toBe("morning");
    expect(phaseAtMinuteOfDay(12 * 60).id).toBe("noon");
    expect(phaseAtMinuteOfDay(18 * 60).id).toBe("evening");
    expect(phaseAtMinuteOfDay(23 * 60).id).toBe("evening");
    expect(phaseAtMinuteOfDay(0).id).toBe("night");
    expect([...seen.keys()].sort()).toEqual(["evening", "morning", "night", "noon"]);
  });

  it("allows sleep only during Tối and Đêm", () => {
    expect(canSleepAt(8 * 60)).toBe(false);
    expect(canSleepAt(12 * 60)).toBe(false);
    expect(canSleepAt(17 * 60)).toBe(false);
    expect(canSleepAt(18 * 60)).toBe(true);
    expect(canSleepAt(23 * 60)).toBe(true);
    expect(canSleepAt(2 * 60)).toBe(true);
  });
});

describe("advanceMinutes", () => {
  it("ignores non-positive deltas and sub-minute fractions", () => {
    expect(advanceMinutes(100, 0).events).toEqual([]);
    expect(advanceMinutes(100, -5).totalMinutes).toBe(100);
    expect(advanceMinutes(100.2, 0.5)).toEqual({ totalMinutes: 100.7, events: [] });
  });

  it("emits hour and phase when crossing 12:00 into Chiều", () => {
    const from = 11 * 60 + 59;
    const result = advanceMinutes(from, 2);
    expect(snapshot(result.totalMinutes).clockLabel).toBe("12:01");
    expect(result.events.map((event) => event.type)).toEqual([
      "minute",
      "hourChanged",
      "phaseChanged",
      "minute",
    ]);
    const phase = ofType(result.events, "phaseChanged")[0]!;
    expect(phase).toMatchObject({ phase: "noon", previous: "morning", day: 1 });
    expect(ofType(result.events, "hourChanged").map((event) => event.hour)).toEqual([12]);
  });

  it("emits dayStarted at midnight and enters Đêm", () => {
    const result = advanceMinutes(MINUTES_PER_DAY - 1, 1);
    expect(result.events.map((event) => event.type)).toEqual([
      "minute",
      "hourChanged",
      "phaseChanged",
      "dayStarted",
    ]);
    expect(ofType(result.events, "dayStarted")[0]).toMatchObject({ day: 2 });
    expect(ofType(result.events, "phaseChanged")[0]).toMatchObject({
      phase: "night",
      previous: "evening",
    });
  });

  it("matches a minute-by-minute oracle for a short jump and a multi-day catch-up", () => {
    for (const delta of [80, MINUTE_EVENT_COALESCE_AFTER + MINUTES_PER_DAY]) {
      const from = DEFAULT_START_MINUTES;
      const result = advanceMinutes(from, delta);
      const oracle = boundaryOracle(from, Math.floor(from + delta));
      expect(ofType(result.events, "phaseChanged").map((event) => event.phase)).toEqual(
        oracle.phases,
      );
      expect(ofType(result.events, "hourChanged").map((event) => event.hour)).toEqual(
        oracle.hours,
      );
      expect(ofType(result.events, "dayStarted").map((event) => event.day)).toEqual(oracle.days);
      const minuteCount = ofType(result.events, "minute").reduce(
        (sum, event) => sum + event.count,
        0,
      );
      expect(minuteCount).toBe(oracle.span);
      expect(result.events.some((event) => event.type === "minute" && event.count > 1)).toBe(
        delta > MINUTE_EVENT_COALESCE_AFTER,
      );
    }
  });
});

describe("sleep", () => {
  it("fast-forwards Tối to 06:00 the next day and emits sleep last", () => {
    const from = 22 * 60 + 30;
    const result = sleepToNextMorning(from);
    expect(snapshot(result.totalMinutes)).toMatchObject({
      day: 2,
      hour: 6,
      minute: 0,
      phaseId: "morning",
      clockLabel: "06:00",
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "hourChanged",
      "phaseChanged",
      "dayStarted",
      "sleep",
    ]);
    expect(ofType(result.events, "minute")).toHaveLength(0);
    expect(ofType(result.events, "sleep")[0]).toMatchObject({
      fromTotalMinutes: from,
      toTotalMinutes: result.totalMinutes,
      day: 2,
    });
  });

  it("lands at 06:00 of the same day when already past midnight", () => {
    const result = sleepToNextMorning(MINUTES_PER_DAY + 2 * 60);
    expect(snapshot(result.totalMinutes)).toMatchObject({
      day: 2,
      hour: 6,
      minute: 0,
      phaseId: "morning",
    });
    expect(result.events.map((event) => event.type)).toEqual([
      "hourChanged",
      "phaseChanged",
      "sleep",
    ]);
    expect(ofType(result.events, "dayStarted")).toHaveLength(0);
  });

  it("lands the same morning for a midnight bedtime", () => {
    const result = sleepToNextMorning(MINUTES_PER_DAY);
    expect(snapshot(result.totalMinutes)).toMatchObject({ day: 2, hour: 6, minute: 0 });
    expect(ofType(result.events, "dayStarted")).toHaveLength(0);
  });
});

describe("seekMinutes", () => {
  it("replays boundaries when jumping forward to a phase", () => {
    const result = seekMinutes(8 * 60, 18 * 60);
    expect(snapshot(result.totalMinutes).phaseId).toBe("evening");
    expect(ofType(result.events, "phaseChanged").map((event) => event.phase)).toEqual([
      "noon",
      "evening",
    ]);
  });

  it("teleports backward without per-minute events", () => {
    const result = seekMinutes(22 * 60, 5 * 60);
    expect(snapshot(result.totalMinutes)).toMatchObject({ hour: 5, phaseId: "night", day: 1 });
    expect(ofType(result.events, "minute")).toHaveLength(0);
    expect(ofType(result.events, "phaseChanged")[0]).toMatchObject({
      phase: "night",
      previous: "evening",
    });
    expect(ofType(result.events, "dayStarted")).toHaveLength(0);
  });
});

describe("time bus", () => {
  it("delivers typed events and unsubscribes", () => {
    const bus = createTimeBus();
    const seen: number[] = [];
    const off = bus.on("sleep", (event) => {
      seen.push(event.day);
    });
    bus.emit({ type: "sleep", fromTotalMinutes: 1, toTotalMinutes: 2, day: 4 });
    off();
    bus.emit({ type: "sleep", fromTotalMinutes: 1, toTotalMinutes: 2, day: 9 });
    expect(seen).toEqual([4]);
  });
});

describe("time loop", () => {
  it("pauses, scales speed, and catches up a large delta", () => {
    let total = DEFAULT_START_MINUTES;
    let paused = true;
    let speed = 1;
    const events: TimeEvent[] = [];
    const loop = createTimeLoop({
      getTotalMinutes: () => total,
      setTotalMinutes: (minutes) => {
        total = minutes;
      },
      getSpeed: () => speed,
      isPaused: () => paused,
      emit: (event) => events.push(event),
    });

    loop.start(0);
    loop.tick(REAL_MS_PER_GAME_DAY);
    expect(total).toBe(DEFAULT_START_MINUTES);
    expect(events).toHaveLength(0);

    paused = false;
    loop.tick(REAL_MS_PER_GAME_DAY * 2);
    expect(snapshot(total)).toMatchObject({ day: 2, hour: 8, minute: 0 });
    expect(ofType(events, "dayStarted").map((event) => event.day)).toEqual([2]);

    events.length = 0;
    speed = 60;
    const at = REAL_MS_PER_GAME_DAY * 2;
    loop.tick(at + REAL_MS_PER_GAME_DAY / 60);
    expect(snapshot(total)).toMatchObject({ day: 3, hour: 8, minute: 0 });
    expect(ofType(events, "dayStarted")).toHaveLength(1);
  });

  it("adopts an external seek instead of replaying it", () => {
    let total = 8 * 60;
    const loop = createTimeLoop({
      getTotalMinutes: () => total,
      setTotalMinutes: (minutes) => {
        total = minutes;
      },
      getSpeed: () => 1,
      isPaused: () => false,
      emit: () => {},
    });
    loop.start(0);
    loop.tick(1000);
    const slept = sleepToNextMorning(total);
    total = slept.totalMinutes;
    loop.tick(1016);
    const after = snapshot(total);
    expect(after.day).toBe(2);
    expect(after.hour).toBe(6);
    expect(after.minute).toBeLessThan(2);
  });
});

describe("save migration", () => {
  it("starts v1 saves at 08:00 and keeps a valid v2 clock", () => {
    expect(totalMinutesFromPersisted(undefined, 1)).toBe(DEFAULT_START_MINUTES);
    expect(totalMinutesFromPersisted(123, 0)).toBe(DEFAULT_START_MINUTES);
    expect(totalMinutesFromPersisted(Number.NaN, 2)).toBe(DEFAULT_START_MINUTES);
    expect(totalMinutesFromPersisted(-4, 2)).toBe(DEFAULT_START_MINUTES);
    expect(totalMinutesFromPersisted(22 * 60, 2)).toBe(22 * 60);
  });
});
