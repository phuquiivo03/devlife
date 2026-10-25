import type { CareerState, LifeNotice, LifeState } from "../career/types";
import type { StageId } from "../config";
import type { GameEvent } from "../events/types";
import { applyMoney } from "../vitals/logic";
import { LIFE, foodById, type FoodId } from "./content";
import { LIFE_EVENTS } from "./events-content";
import { furnitureDailyHealth, furnitureDailyMood, furnitureSleepBonus } from "./furniture";
import { notePurse } from "./purse";
import { foodPrice, traitDecay, traitHomeMood, traitMoodFloor, traitMorningEnergy } from "./traits";

export type Calendar = {
  year: number;
  month: number;
  dayOfMonth: number;
  /** 0 = Monday … 6 = Sunday. Day 1 of a save is Monday. */
  weekday: number;
  weekdayLabel: string;
  weekend: boolean;
};

export type Vitals = {
  energy: number;
  health: number;
  mood: number;
  money: number;
  fullness: number;
};

export type LifeResult = {
  state: CareerState;
  events: GameEvent[];
  skipDays: number;
};

const NEUTRAL_TRAIT = LIFE.trait_multiplier;
const NO_FURNITURE = LIFE.furniture_add;

export function defaultLife(day: number): LifeState {
  return {
    mealsToday: 0,
    positiveMoodApplies: 0,
    workStreak: 0,
    workedToday: false,
    funSlotsToday: 0,
    lateSlotsToday: 0,
    moodPenaltyTomorrow: 0,
    rentDebtDays: 0,
    rentIssuedKey: null,
    paidRentKey: null,
    paidUtilitiesKey: null,
    paidSalaryKey: null,
    burnoutDay: null,
    lastEndedDay: null,
    settledDay: null,
    morningResolvedDay: null,
    wakeBudget: slotBudget(day),
    suppressEndOfDayUntil: null,
    homeDays: 0,
    hungryNoticed: false,
    starvingNoticed: false,
    jobNoticeSlots: 0,
  };
}

export function lifeOf(state: CareerState): LifeState {
  return state.life ?? defaultLife(state.players.game_day || 1);
}

export function calendar(day: number): Calendar {
  const index = Math.max(0, day - 1);
  const weekday = index % LIFE.days_per_week;
  return {
    year: Math.floor(index / (LIFE.days_per_month * LIFE.months_per_year)) + 1,
    month: (Math.floor(index / LIFE.days_per_month) % LIFE.months_per_year) + 1,
    dayOfMonth: (index % LIFE.days_per_month) + 1,
    weekday,
    weekdayLabel: LIFE.weekdays[weekday] ?? "T2",
    weekend: weekday >= 5,
  };
}

export function monthKey(day: number): string {
  const cal = calendar(day);
  return `${cal.year}-${cal.month}`;
}

export function slotBudget(day: number): number {
  return calendar(day).weekend ? LIFE.weekend_slots : LIFE.weekday_slots;
}

/** Slots since 06:00. 0 is 06:00–08:00. 10 is 02:00–04:00. */
export function slotIndexFromWake(minuteOfDay: number): number {
  const fromWake = (minuteOfDay - 6 * 60 + 24 * 60) % (24 * 60);
  return Math.floor(fromWake / (LIFE.slot_hours * 60));
}

export function hoursUntilWake(minuteOfDay: number): number {
  const wake = 6 * 60;
  const delta = (wake - minuteOfDay + 24 * 60) % (24 * 60);
  return delta / 60;
}

export function holidayOn(day: number): string | null {
  const cal = calendar(day);
  for (const holiday of LIFE.holidays) {
    if (holiday.month !== cal.month) continue;
    if (cal.dayOfMonth >= holiday.day && cal.dayOfMonth < holiday.day + holiday.length) {
      return holiday.id;
    }
  }
  return null;
}

export function isDeployFriday(day: number): boolean {
  return calendar(day).weekday === 4;
}

/** Positive base cost after the work-streak multiplier. Gains are unchanged. */
export function energyCost(base: number, workStreak: number): number {
  if (!(base > 0) || workStreak < LIFE.work_streak_at) return Math.max(0, base);
  return base * LIFE.work_streak_energy_cost;
}

export function energyMaxForHealth(health: number): number {
  return health < LIFE.sick_below ? LIFE.sick_energy_max : LIFE.healthy_energy_max;
}

export function scaleXpForMood(amount: number, mood: number): number {
  if (!(amount > 0)) return 0;
  if (mood >= LIFE.mood_xp_below) return amount;
  return Math.floor(amount * LIFE.mood_xp_multiplier);
}

export function moodBugBonus(mood: number): number {
  return mood < LIFE.mood_xp_below ? LIFE.mood_bug_bonus : 0;
}

/** pay = base * (1 + 0.1 * diff) * (0.8 + rep / 250), rounded to đồng. */
export function jobPay(base: number, diff: number, reputation: number): number {
  if (!(base > 0)) return 0;
  const raw = base * (1 + 0.1 * diff) * (0.8 + reputation / 250);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.round(raw));
}

export function stageBill(table: Record<StageId, number>, stage: string): number {
  if (stage === "junior" || stage === "senior" || stage === "student") return table[stage];
  return table.student;
}

function clampStat(value: number): number {
  if (!Number.isFinite(value)) return LIFE.stat_min;
  return Math.max(LIFE.stat_min, Math.min(LIFE.stat_max, value));
}

function vitalsOf(state: CareerState): Vitals {
  return {
    energy: state.players.energy,
    health: state.players.health,
    mood: state.players.mood,
    money: state.players.money,
    fullness: state.players.fullness,
  };
}

function writeVitals(state: CareerState, vitals: Vitals, life: LifeState): CareerState {
  return {
    ...state,
    life,
    players: {
      ...state.players,
      energy: vitals.energy,
      health: vitals.health,
      mood: vitals.mood,
      money: vitals.money,
      fullness: vitals.fullness,
    },
  };
}

/**
 * Clamp, sick energy cap, burnout schedule, hospital.
 * Hospital sets health to the discharge value and asks the clock to skip 2 days.
 */
function finish(
  state: CareerState,
  before: Vitals,
  next: Vitals,
  life: LifeState,
  events: GameEvent[],
): LifeResult {
  let energy = clampStat(next.energy);
  const health = clampStat(next.health);
  let mood = clampStat(next.mood);
  const fullness = clampStat(next.fullness);
  const floor = traitMoodFloor(state);
  if (floor != null) mood = Math.max(mood, floor);
  const money = applyMoney(0, next.money);
  const beforeHospital = money;
  let skipDays = 0;
  let nextLife = life;

  if (health < LIFE.sick_below) energy = Math.min(energy, LIFE.sick_energy_max);

  if (mood < LIFE.burnout_below) {
    const scheduled = state.players.game_day + 1;
    nextLife = {
      ...nextLife,
      burnoutDay: Math.max(nextLife.burnoutDay ?? 0, scheduled),
    };
  }

  if (health < LIFE.hospital_below) {
    // Hospital admission triggered - will be processed on discharge
    // Don't apply health/money changes yet, just set skipDays
    skipDays = LIFE.hospital_days;
    nextLife = {
      ...nextLife,
      workStreak: 0,
      suppressEndOfDayUntil: state.players.game_day + LIFE.hospital_days,
    };
    // Keep health as is (it will be clamped on discharge)
  }

  const after: Vitals = { energy, health, mood, money, fullness };
  const deltaEvents: GameEvent[] = [];
  if (after.energy !== before.energy) {
    deltaEvents.push({
      type: "energyChanged",
      delta: after.energy - before.energy,
      energy: after.energy,
    });
  }
  if (after.health !== before.health) {
    deltaEvents.push({
      type: "healthChanged",
      delta: after.health - before.health,
      health: after.health,
    });
  }
  if (after.mood !== before.mood) {
    deltaEvents.push({
      type: "moodChanged",
      delta: after.mood - before.mood,
      mood: after.mood,
    });
  }
  if (after.fullness !== before.fullness) {
    deltaEvents.push({
      type: "fullnessChanged",
      delta: after.fullness - before.fullness,
      fullness: after.fullness,
    });
  }
  if (after.money !== before.money) {
    deltaEvents.push({
      type: "moneyChanged",
      delta: after.money - before.money,
      money: after.money,
    });
  }

  const hospitalDelta = money - beforeHospital;
  let written = writeVitals(state, after, nextLife);
  if (hospitalDelta !== 0) written = notePurse(written, hospitalDelta, "other");
  return {
    state: written,
    events: [...events, ...deltaEvents],
    skipDays,
  };
}

function applyDirect(
  state: CareerState,
  delta: Partial<Pick<Vitals, "energy" | "health" | "mood" | "money" | "fullness">>,
  life: LifeState = lifeOf(state),
): LifeResult {
  const before = vitalsOf(state);
  return finish(
    state,
    before,
    {
      energy: before.energy + (delta.energy ?? 0),
      health: before.health + (delta.health ?? 0),
      mood: before.mood + (delta.mood ?? 0),
      money: before.money + (delta.money ?? 0),
      fullness: before.fullness + (delta.fullness ?? 0),
    },
    life,
    [],
  );
}

/**
 * Action order: base, diminishing positive mood, personality, furniture, streak, clamp, thresholds.
 * The generic personality multiplier stays 1. Named traits apply their own rates at the call site.
 * Job energy and work XP apply their furniture rates at the call site.
 */
export function applyActionStats(
  state: CareerState,
  delta: { energy?: number; health?: number; mood?: number; money?: number; fullness?: number },
  life: LifeState = lifeOf(state),
): LifeResult {
  const before = vitalsOf(state);
  let energy = delta.energy ?? 0;
  let health = delta.health ?? 0;
  let mood = delta.mood ?? 0;
  let applies = life.positiveMoodApplies;
  if (mood > 0) {
    mood *= LIFE.diminishing_mood ** applies;
    applies += 1;
  }
  energy *= NEUTRAL_TRAIT;
  health *= NEUTRAL_TRAIT;
  mood *= NEUTRAL_TRAIT;
  energy += NO_FURNITURE;
  health += NO_FURNITURE;
  mood += NO_FURNITURE;
  if (energy < 0 && life.workStreak >= LIFE.work_streak_at) {
    energy *= LIFE.work_streak_energy_cost;
  }
  return finish(
    state,
    before,
    {
      energy: before.energy + energy,
      health: before.health + health,
      mood: before.mood + mood,
      money: before.money + (delta.money ?? 0),
      fullness: before.fullness + (delta.fullness ?? 0),
    },
    { ...life, positiveMoodApplies: applies },
    [],
  );
}

/** Event effects add and clamp. They skip trait multipliers, furniture, diminishing, and streak. The Lạc quan floor still applies. */
export function applyEventStats(
  state: CareerState,
  delta: { energy?: number; health?: number; mood?: number; money?: number },
): LifeResult {
  return applyDirect(state, delta, lifeOf(state));
}

export function markWorked(state: CareerState): CareerState {
  const life = lifeOf(state);
  if (life.workedToday) return { ...state, life };
  return { ...state, life: { ...life, workedToday: true } };
}

function pushFullnessNotice(state: CareerState, life: LifeState, notice: LifeNotice): CareerState {
  const feed = state.feed;
  if (!feed) return state;
  if (feed.notices.some((row) => row.id === notice.id)) return state;
  const notices = [...feed.notices, notice];
  const cap = LIFE_EVENTS.notice_cap;
  return {
    ...state,
    life,
    feed: { ...feed, notices: notices.length > cap ? notices.slice(notices.length - cap) : notices },
  };
}

/**
 * Waking hunger over `minutes` of in-game time, applied in one batch so a
 * coalesced catch-up tick equals minute-by-minute play at any speed: fullness
 * drains for as long as it lasts, and only the remainder after it reaches 0
 * costs health. Sleep passes `asleep: true` (hospital skips the clock entirely).
 * Health stays a float here so per-minute starvation is not rounded away.
 */
export function tickFullness(
  state: CareerState,
  minutes: number,
  options: { asleep?: boolean } = {},
): LifeResult {
  const total = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  if (options.asleep || total <= 0) return { state, events: [], skipDays: 0 };
  const fullness = state.players.fullness;
  const drainPerMinute = LIFE.fullness_drain_per_hour / 60;
  const fedMinutes = Math.min(total, fullness / drainPerMinute);
  const starvingMinutes = total - fedMinutes;
  const nextFullness = Math.max(LIFE.stat_min, fullness - fedMinutes * drainPerMinute);
  const healthDelta = -starvingMinutes * (LIFE.starve_health_per_hour / 60);

  const life = lifeOf(state);
  const nextLife: LifeState = { ...life };
  let withNotices = state;
  if (nextFullness < LIFE.fullness_eat_below && !life.hungryNoticed) {
    nextLife.hungryNoticed = true;
    withNotices = pushFullnessNotice(
      withNotices,
      nextLife,
      hungerNotice(state, "hungry", LIFE.fullness_hungry_notice, "warn"),
    );
  }
  if (nextFullness <= 0 && !life.starvingNoticed) {
    nextLife.starvingNoticed = true;
    withNotices = pushFullnessNotice(
      withNotices,
      nextLife,
      hungerNotice(state, "starving", LIFE.fullness_starving_notice, "urgent"),
    );
  }
  return applyDirect(
    withNotices,
    { health: healthDelta, fullness: nextFullness - fullness },
    nextLife,
  );
}

function hungerNotice(
  state: CareerState,
  kind: "hungry" | "starving",
  text: string,
  severity: LifeNotice["severity"],
): LifeNotice {
  return {
    id: `fullness-${kind}-${state.players.game_day}-${lifeOf(state).mealsToday}`,
    day: state.players.game_day,
    minute: state.players.game_minute,
    severity,
    icon: "icon_notif_event.png",
    text,
    action: "eat",
    read: false,
  };
}

export function eatMeal(state: CareerState, foodId: FoodId): LifeResult {
  const food = foodById(foodId);
  if (!food) {
    return { state, events: [], skipDays: 0 };
  }
  if (state.players.fullness >= LIFE.fullness_eat_below) {
    return { state, events: [], skipDays: 0 };
  }
  const price = foodPrice(food.price, state);
  const life = lifeOf(state);
  const spent = applyActionStats(
    state,
    {
      money: -price,
      health: food.health,
      mood: food.mood,
      fullness: LIFE.fullness_after_meal - state.players.fullness,
    },
    {
      ...life,
      mealsToday: life.mealsToday + 1,
      hungryNoticed: false,
      starvingNoticed: false,
    },
  );
  return { ...spent, state: notePurse(spent.state, -price, "food") };
}

/** Order: unknown food → not hungry enough (`fullness_eat_below`). Money never blocks a meal — eating while broke takes the balance negative. */
export function mealBlocked(state: CareerState, foodId: FoodId): string | null {
  const food = foodById(foodId);
  if (!food) return "Không có món này";
  if (state.players.fullness >= LIFE.fullness_eat_below) return LIFE.fullness_eat_block;
  return null;
}

import { phaseAtMinuteOfDay } from "../time/clock";
import type { PhaseId } from "../time/config";
import type { GameOutcomeDef } from "./content";

export type GameGuard = { minuteOfDay: number; hospitalOpen: boolean; taskOpen: boolean };

/** Base mood of the next slot after the daily halving, before the outcome, clamp, and the Lạc quan floor. */
export function gameMoodGain(state: CareerState): number {
  const played = lifeOf(state).funSlotsToday;
  return played < LIFE.game_daily_full ? LIFE.game_mood : LIFE.game_mood * LIFE.game_extra_mood_multiplier;
}

/** Vietnamese reason the Chơi game action is blocked, or null. Order: hospital, task, phase, energy. */
export function gameBlocked(state: CareerState, guard: GameGuard): string | null {
  if (guard.hospitalOpen) return LIFE.game_block_hospital;
  if (guard.taskOpen) return LIFE.game_block_task;
  if (!LIFE.game_phases.includes(phaseAtMinuteOfDay(guard.minuteOfDay).id as PhaseId)) return LIFE.game_block_phase;
  if (state.players.energy < energyCost(LIFE.game_energy, lifeOf(state).workStreak)) return LIFE.game_block_energy;
  return null;
}

/** Used only when the table has no positive weight. Neutral: base gain × 1. */
const GAME_OUTCOME_FALLBACK: GameOutcomeDef = { id: "normal", label: "", weight: 1, mood_mult: 1 };

/** Weighted pick, same algorithm as pickWeighted in events.ts. Rows with a weight that is not finite or ≤ 0 are skipped. */
export function pickGameOutcome(rng: () => number, table: readonly GameOutcomeDef[] = LIFE.game_outcomes): GameOutcomeDef {
  const rows = table.filter((row) => Number.isFinite(row.weight) && row.weight > 0);
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  if (rows.length === 0 || total <= 0) return GAME_OUTCOME_FALLBACK;
  let cursor = rng() * total;
  for (const row of rows) {
    cursor -= row.weight;
    if (cursor < 0) return row;
  }
  return rows[rows.length - 1]!;              // rng() === 1 or float drift
}
/** Order: base → daily halving → outcome mult, rounded once to a whole number. A `mood_delta` row is flat and skips both. */
export function gameOutcomeMood(state: CareerState, outcome: GameOutcomeDef): number {
  if (outcome.mood_delta != null && Number.isFinite(outcome.mood_delta)) return Math.round(outcome.mood_delta);
  const mult = outcome.mood_mult != null && Number.isFinite(outcome.mood_mult) ? outcome.mood_mult : 1;
  return Math.round(gameMoodGain(state) * mult);
}

export type GameSlotResult = LifeResult & {
  outcome: GameOutcomeDef;
  /** Mood actually applied after clamp and the Lạc quan floor (after − before). */
  moodDelta: number;
};

/** One Chơi game slot: rolled outcome mood, energy cost, +1 fun slot (any outcome). No money. The caller advances the clock. */
export function playGameSlot(state: CareerState, rng: () => number): GameSlotResult {
  const life = lifeOf(state);
  const outcome = pickGameOutcome(rng);
  // Use applyDirect (not applyActionStats) to avoid diminishing mood (0.6^positiveMoodApplies) and positiveMoodApplies increment.
  // Chơi game has its own daily halving rule via gameMoodGain, so we skip diminishing.
  const result = applyDirect(
    state,
    { mood: gameOutcomeMood(state, outcome), energy: -energyCost(LIFE.game_energy, life.workStreak) },
    { ...life, funSlotsToday: life.funSlotsToday + 1 },
  );
  return { ...result, outcome, moodDelta: result.state.players.mood - state.players.mood };
}

/** Bubble text, e.g. "Thắng streak liên tục, sướng ghê! · Tinh thần +12". Zero shows "+0". */
export function gameBubbleText(outcome: GameOutcomeDef, moodDelta: number): string {
  const shown = Math.round(moodDelta);
  return `${outcome.label} · ${LIFE.game_bubble_mood} ${shown < 0 ? "−" + Math.abs(shown) : "+" + shown}`;
}

function endOfDay(state: CareerState): LifeResult {
  const life = lifeOf(state);
  const day = state.players.game_day;
  if (life.suppressEndOfDayUntil != null && day < life.suppressEndOfDayUntil) {
    return {
      state: { ...state, life: { ...life, lastEndedDay: day } },
      events: [],
      skipDays: 0,
    };
  }
  if (life.lastEndedDay != null && life.lastEndedDay >= day) {
    return { state, events: [], skipDays: 0 };
  }

  // Hunger is already charged per waking hour by tickFullness (starvation), so
  // the day close only pays the bonus for a full 3 meals. A meals-low penalty
  // here would double-charge. See docs for the M7 decision.
  let health = 0;
  if (life.mealsToday >= LIFE.meals_full) health += LIFE.meals_full_health;

  const workStreak = life.workedToday ? life.workStreak + 1 : 0;
  const homeDays = life.funSlotsToday > 0 ? 0 : (Number.isFinite(life.homeDays) ? life.homeDays : 0) + 1;
  health += furnitureDailyHealth(state);
  let mood = furnitureDailyMood(state);
  mood += (LIFE.mood_anchor - state.players.mood) * LIFE.mood_regress;
  if (workStreak >= LIFE.work_streak_at && life.funSlotsToday < LIFE.fun_slots_for_grind) {
    mood += LIFE.grind_mood;
  }
  mood += traitHomeMood(state, homeDays);

  const nextLife: LifeState = {
    ...life,
    workStreak,
    workedToday: false,
    mealsToday: 0,
    funSlotsToday: 0,
    lateSlotsToday: 0,
    homeDays,
    lastEndedDay: day,
  };
  return applyDirect(state, { health, mood }, nextLife);
}

/** Bills, Monday flavor, rent-debt mood. Idempotent per calendar day via the paid keys. */
export function settleCalendarDay(state: CareerState, day: number, stage: string): LifeResult {
  const life = lifeOf(state);
  if (life.settledDay === day) return { state, events: [], skipDays: 0 };
  const cal = calendar(day);
  const key = monthKey(day);
  let money = 0;
  let mood = 0;
  let rentPaid = 0;
  let utilitiesPaid = 0;
  let salaryPaid = 0;
  const next = { ...life };

  if (cal.dayOfMonth === LIFE.bill_day && next.rentIssuedKey !== key) {
    next.rentIssuedKey = key;
    const rent = stageBill(LIFE.rent, stage);
    if (state.players.money + money >= rent) {
      money -= rent;
      rentPaid = rent;
      next.paidRentKey = key;
      next.rentDebtDays = 0;
    } else {
      next.rentDebtDays = next.rentDebtDays > 0 ? next.rentDebtDays + 1 : 1;
    }
    const utilities = stageBill(LIFE.utilities, stage);
    if (next.paidUtilitiesKey !== key && state.players.money + money >= utilities) {
      money -= utilities;
      utilitiesPaid = utilities;
      next.paidUtilitiesKey = key;
    }
  } else if (next.rentIssuedKey === key && next.paidRentKey !== key) {
    next.rentDebtDays += 1;
  }

  if (next.rentIssuedKey === key && next.paidRentKey !== key && next.rentDebtDays > 0) {
    mood += LIFE.rent_debt_mood;
  }

  if (cal.dayOfMonth === LIFE.salary_day && next.paidSalaryKey !== key) {
    const salary = stageBill(LIFE.salary, stage);
    if (salary > 0) {
      money += salary;
      salaryPaid = salary;
      next.paidSalaryKey = key;
    }
  }

  if (cal.weekday === 0) mood += LIFE.monday_mood;

  if (state.players.mood + mood < LIFE.burnout_below) {
    next.burnoutDay = Math.max(next.burnoutDay ?? 0, day + 1);
  }
  next.settledDay = day;

  let noted = state;
  if (rentPaid) noted = notePurse(noted, -rentPaid, "rent");
  if (utilitiesPaid) noted = notePurse(noted, -utilitiesPaid, "rent");
  if (salaryPaid) noted = notePurse(noted, salaryPaid, "earn");
  if (money === 0 && mood === 0) {
    return { state: { ...noted, life: next }, events: [], skipDays: 0 };
  }
  return applyDirect({ ...noted, life: next }, { money, mood }, next);
}

/**
 * Close the day that just ended, then apply the new day's bills.
 * 06:00 also resolves the queued morning mood when `resolveMorning` is set.
 */
export function applyLifeDayStart(
  state: CareerState,
  day: number,
  stage: string,
  options: { resolveMorning: boolean },
): LifeResult {
  const ended = endOfDay(state);
  const billed = settleCalendarDay(
    { ...ended.state, players: { ...ended.state.players, game_day: day } },
    day,
    stage,
  );
  const merged: LifeResult = {
    state: billed.state,
    events: [...ended.events, ...billed.events],
    skipDays: Math.max(ended.skipDays, billed.skipDays),
  };
  if (!options.resolveMorning || merged.skipDays > 0) return merged;
  const morning = resolveMorning(merged.state, day);
  return {
    state: morning.state,
    events: [...merged.events, ...morning.events],
    skipDays: Math.max(merged.skipDays, morning.skipDays),
  };
}

export function resolveMorning(state: CareerState, day: number): LifeResult {
  const life = lifeOf(state);
  if (life.morningResolvedDay === day) return { state, events: [], skipDays: 0 };
  const penalty = life.moodPenaltyTomorrow;
  const nextLife: LifeState = {
    ...life,
    moodPenaltyTomorrow: 0,
    positiveMoodApplies: 0,
    morningResolvedDay: day,
    wakeBudget: slotBudget(day),
    hungryNoticed: false,
    starvingNoticed: false,
  };
  const rested = applyDirect(
    state,
    {
      mood: penalty > 0 ? -penalty : 0,
      energy: traitMorningEnergy(state),
      fullness: LIFE.fullness_wake - state.players.fullness,
    },
    nextLife,
  );
  return crossWakingSlot(rested.state, 6 * 60, rested.events, rested.skipDays);
}

/** One waking slot. Late slots past the wake budget cost health and queue tomorrow's mood. */
export function crossWakingSlot(
  state: CareerState,
  minuteOfDay: number,
  priorEvents: GameEvent[] = [],
  priorSkip = 0,
): LifeResult {
  const life = lifeOf(state);
  const index = slotIndexFromWake(minuteOfDay);
  const budget = life.wakeBudget > 0 ? life.wakeBudget : slotBudget(state.players.game_day);
  if (index >= budget) {
    const late = applyDirect(
      state,
      { health: LIFE.late_slot_health },
      {
        ...life,
        lateSlotsToday: life.lateSlotsToday + 1,
        moodPenaltyTomorrow: life.moodPenaltyTomorrow + Math.abs(LIFE.late_slot_mood_tomorrow),
      },
    );
    return {
      state: late.state,
      events: [...priorEvents, ...late.events],
      skipDays: Math.max(priorSkip, late.skipDays),
    };
  }
  let mood = LIFE.passive_slot_mood * traitDecay(state);
  if (life.workStreak >= LIFE.work_streak_at) mood += LIFE.work_streak_slot_mood;
  const ticked = applyDirect(state, { mood }, life);
  return {
    state: ticked.state,
    events: [...priorEvents, ...ticked.events],
    skipDays: Math.max(priorSkip, ticked.skipDays),
  };
}

/** Debug helper. Sets No bụng directly; clamps and emits like any vital change. */
export function setFullness(state: CareerState, value: number): LifeResult {
  return applyDirect(state, { fullness: value - state.players.fullness });
}

/** HUD low warning. Sức khỏe blinks below `sick_below`, No bụng below `fullness_eat_below`. */
export function isLowStat(key: "health" | "fullness", value: number): boolean {
  return value < (key === "health" ? LIFE.sick_below : LIFE.fullness_eat_below);
}

export function applySleepRest(state: CareerState, hours: number): LifeResult {
  const life = lifeOf(state);
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 0;
  const emax = energyMaxForHealth(state.players.health);
  const energy =
    Math.min(emax, state.players.energy + LIFE.sleep_energy_per_hour * safeHours + furnitureSleepBonus(state)) -
    state.players.energy;
  let health = 0;
  let penalty = life.moodPenaltyTomorrow;
  if (safeHours < LIFE.sleep_short_hours) {
    health = -LIFE.sleep_short_health_per_missing_hour * (LIFE.sleep_short_hours - safeHours);
    penalty += Math.abs(LIFE.sleep_short_mood_tomorrow);
  }
  return applyDirect(state, { energy, health }, { ...life, moodPenaltyTomorrow: penalty });
}

export function rentStatus(state: CareerState, day: number): "unbilled" | "paid" | "late" {
  const life = lifeOf(state);
  const key = monthKey(day);
  if (life.paidRentKey === key) return "paid";
  if (life.rentIssuedKey === key) return "late";
  return "unbilled";
}
