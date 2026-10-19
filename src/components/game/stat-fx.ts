import type { CareerState } from "@/game/career/types";
import { formatVnd } from "@/lib/format-currency";
import { STAT_FX } from "./stat-fx.config";

export type StatKey = "money" | "health" | "mood" | "energy" | "reputation";

/** Display order = stagger order: status bar first, then HUD left→right, then the side panel. */
export const STAT_ORDER: readonly StatKey[] = ["money", "health", "mood", "energy", "reputation"];

export type StatSample = Record<StatKey, number> & {
  paidSalaryKey: string | null;
  paidRentKey: string | null;
  paidUtilitiesKey: string | null;
};

export function sampleCareer(career: CareerState): StatSample {
  const players = career.players ?? {};
  const life = (career as unknown as { life?: { paidSalaryKey?: string | null; paidRentKey?: string | null; paidUtilitiesKey?: string | null } }).life ?? {};
  return {
    money: Number(players.money ?? 0),
    health: Number(players.health ?? 0),
    mood: Number(players.mood ?? 0),
    energy: Number(players.energy ?? 0),
    reputation: Number(players.reputation ?? 0),
    paidSalaryKey: life.paidSalaryKey ?? null,
    paidRentKey: life.paidRentKey ?? null,
    paidUtilitiesKey: life.paidUtilitiesKey ?? null,
  };
}

export type FloaterTone = "gain" | "loss" | "time";
export type FloaterSpec = {
  key: StatKey;
  delta: number;
  text: string;
  tone: FloaterTone;
  big: boolean;
  delayMs: number;
};

export const MINUS = "−";

export function signedVnd(delta: number): string {
  const abs = Math.abs(Math.round(delta));
  const formatted = formatVnd(abs).replace(/^-/, "");
  const sign = delta > 0 ? "+" : MINUS;
  return `${sign}${formatted}`;
}

export function signedInt(delta: number): string {
  const sign = delta > 0 ? "+" : MINUS;
  const abs = Math.abs(Math.round(delta));
  return `${sign}${abs}`;
}

/** Label for a money change from the paid keys that flipped in this window, or null. */
export function moneyLabel(prev: StatSample, next: StatSample, fx = STAT_FX): string | null {
  const salaryChanged = prev.paidSalaryKey !== next.paidSalaryKey && next.paidSalaryKey != null;
  const rentChanged = prev.paidRentKey !== next.paidRentKey && next.paidRentKey != null;
  const utilChanged = prev.paidUtilitiesKey !== next.paidUtilitiesKey && next.paidUtilitiesKey != null;

  const parts: string[] = [];
  if (salaryChanged) parts.push(fx.labels.salary);
  if (rentChanged && utilChanged) {
    parts.push(fx.labels.rentAndUtilities);
  } else {
    if (rentChanged) parts.push(fx.labels.rent);
    if (utilChanged) parts.push(fx.labels.utilities);
  }
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Net change per stat between two samples, in STAT_ORDER, with stagger delays.
 * Vitals and reputation compare the ROUNDED values the UI shows (so 58.4 → 59.6 is "+1", 58.4 → 58.6 is nothing).
 * Money compares Math.round values. A zero delta produces no floater.
 */
export function diffStats(prev: StatSample, next: StatSample, fx = STAT_FX): FloaterSpec[] {
  const specs: FloaterSpec[] = [];
  let delayIndex = 0;

  for (const key of STAT_ORDER) {
    const prevRaw = prev[key];
    const nextRaw = next[key];
    const rawDelta = nextRaw - prevRaw;
    const delta = key === "money"
      ? Math.round(nextRaw) - Math.round(prevRaw)
      : Math.round(rawDelta);
    if (delta === 0) continue;

    let text: string;
    let big = false;
    if (key === "money") {
      const label = moneyLabel(prev, next, fx);
      text = signedVnd(delta) + (label ? " " + label : "");
      big = Math.abs(delta) >= fx.bigMoneyVnd;
    } else {
      text = signedInt(delta);
    }

    specs.push({
      key,
      delta,
      text,
      tone: (delta > 0 ? "gain" : "loss") as FloaterTone,
      big,
      delayMs: delayIndex * fx.floatStaggerMs,
    });
    delayIndex++;
  }

  return specs;
}

export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/** Tween position. duration ≤ 0 or elapsed ≥ duration → to. elapsed ≤ 0 → from. */
export function tweenValue(from: number, to: number, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return to;
  if (elapsedMs <= 0) return from;
  if (elapsedMs >= durationMs) return to;
  const t = easeOutCubic(elapsedMs / durationMs);
  return from + (to - from) * t;
}

export function tweenMsFor(key: StatKey, delta: number, fx = STAT_FX): number {
  if (key === "money" && Math.abs(delta) >= fx.bigMoneyVnd) return fx.tweenBigMs;
  return fx.tweenMs;
}
