import lifeSim from "../../../config/life_sim.json";
import type { StageId } from "../config";

export type FoodId = "noodles" | "banh_mi" | "home_rice" | "com_tam" | "bun_bo" | "ga_chien";

export type FoodDef = {
  id: FoodId;
  label: string;
  price: number;
  health: number;
};

export type HolidayDef = {
  id: string;
  month: number;
  day: number;
  length: number;
};

export type GameOutcomeDef = { id: string; label: string; weight: number; mood_mult?: number; mood_delta?: number };

export type LifeConfig = {
  slot_hours: number;
  weekday_slots: number;
  weekend_slots: number;
  days_per_week: number;
  days_per_month: number;
  months_per_year: number;
  late_slot_health: number;
  late_slot_mood_tomorrow: number;
  monday_mood: number;
  stat_min: number;
  stat_max: number;
  diminishing_mood: number;
  trait_multiplier: number;
  trait_decay: number;
  furniture_add: number;
  furniture_daily_mood: number;
  furniture_sleep_bonus: number;
  furniture_cap_per_stat: number;
  work_streak_at: number;
  work_streak_energy_cost: number;
  work_streak_slot_mood: number;
  passive_slot_mood: number;
  meals_full: number;
  meals_full_health: number;
  /** Fullness ceiling. The bar drains from this to 0. */
  fullness_max: number;
  /** Fullness lost per waking hour. `fullness_max` / this = hours from full to empty. */
  fullness_drain_per_hour: number;
  /** Fullness assigned when the player wakes up. Below `fullness_eat_below` so breakfast is allowed. */
  fullness_wake: number;
  /** Eating is blocked at or above this fullness. */
  fullness_eat_below: number;
  /** Fullness set by every meal. */
  fullness_after_meal: number;
  /** Health lost per hour while fullness is 0. */
  starve_health_per_hour: number;
  /** Fullness for a save that predates the stat. */
  fullness_default_migrate: number;
  fullness_hungry_notice: string;
  fullness_starving_notice: string;
  fullness_eat_block: string;
  mood_anchor: number;
  mood_regress: number;
  fun_slots_for_grind: number;
  grind_mood: number;
  sleep_energy_per_hour: number;
  sleep_short_hours: number;
  sleep_short_health_per_missing_hour: number;
  sleep_short_mood_tomorrow: number;
  sick_below: number;
  sick_energy_max: number;
  healthy_energy_max: number;
  hospital_below: number;
  hospital_days: number;
  hospital_cost: number;
  hospital_discharge_health: number;
  low_energy_job: number;
  mood_xp_below: number;
  mood_xp_multiplier: number;
  mood_bug_bonus: number;
  burnout_below: number;
  force_health: number;
  starting_health: number;
  starting_mood: number;
  rent_debt_mood: number;
  rent_remind_day: number;
  rent_knock_day: number;
  bill_day: number;
  salary_day: number;
  rent: Record<StageId, number>;
  utilities: Record<StageId, number>;
  salary: Record<StageId, number>;
  /** Waking slots between new job notices. */
  job_notice_every_slots: number;
  /** Unaccepted job notices kept in the list. */
  job_notice_pending_max: number;
  /** Days a job notice stays open. */
  job_notice_expire_days: number;
  /** Days to finish an easy (tier 1) job. Version 18 counts this from the migration day. */
  job_deadline_easy: number;
  /** Days to finish a mid (tier 2) job. Version 18 counts this from the migration day. */
  job_deadline_mid: number;
  /** Days to finish a hard (tier 3+) job. Version 18 counts this from the migration day. */
  job_deadline_hard: number;
  /** Reputation change when an accepted job misses its deadline. */
  job_late_reputation: number;
  /** Mood change when an accepted job misses its deadline. */
  job_late_mood: number;
  /** Reminder fires, and the board deadline turns red, when this many days or fewer remain. */
  job_remind_days: number;
  /** Mood per Chơi game slot while today's count is under `game_daily_full`. */ game_mood: number;
  /** Energy cost per slot (positive). The work-streak ×1.2 applies via energyCost. */ game_energy: number;
  /** Full-value slots per calendar day. From the next slot the mood is × game_extra_mood_multiplier. */ game_daily_full: number;
  game_extra_mood_multiplier: number;
  /** Phases where Chơi game is allowed. */ game_phases: string[];
  game_label: string;
  game_block_phase: string;
  game_block_energy: string;
  game_block_hospital: string;
  game_block_task: string;
  /** Word before the mood change in the result bubble, e.g. "Tinh thần +12". */ game_bubble_mood: string;
  /** Weighted Chơi game results. Energy is the same for every row. */ game_outcomes: GameOutcomeDef[];
  foods: FoodDef[];
  weekdays: string[];
  holidays: HolidayDef[];
};

export const LIFE: LifeConfig = lifeSim as LifeConfig;

export function foodById(id: string): FoodDef | null {
  return LIFE.foods.find((food) => food.id === id) ?? null;
}
