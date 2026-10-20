import storeConfig from "../../../config/store.json";
import placementFile from "./placement.json";
import type { CareerState, ShopState } from "../career/types";
import type { StageId } from "../config";
import { LIFE } from "./content";

type PlacementRow = {
  item: string;
  room: StageId;
  anchor: { x: number; y: number };
  size: { w: number; h: number };
  facing: string;
  replaces: string | null;
  kind: "floor" | "wall" | "surface";
  sprite?: string;
};

// PLACEMENT_ITEMS kept for potential future use
const _PLACEMENT_ITEMS = (placementFile as { items: PlacementRow[] }).items;

export type StoreItem = {
  id: string;
  label: string;
  price: number;
  icon: string;
  /** Set on a room. Its bonuses apply only while the player lives there. */
  stage?: StageId;
  skills?: number;
  level?: number;
  reputation?: number;
  requires?: string;
  sleep?: number;
  daily_mood?: number;
  daily_health?: number;
};

export const STORE = storeConfig;

function asStage(value: string | undefined): StageId | undefined {
  if (value === "student" || value === "junior" || value === "senior") return value;
  return undefined;
}

export const STORE_ITEMS: readonly StoreItem[] = storeConfig.items.map((item) => ({
  id: item.id,
  label: item.label,
  price: item.price,
  icon: item.icon,
  stage: "stage" in item ? asStage(item.stage) : undefined,
  skills: "skills" in item ? item.skills : undefined,
  level: "level" in item ? item.level : undefined,
  reputation: "reputation" in item ? item.reputation : undefined,
  requires: "requires" in item ? (item as { requires?: string }).requires : undefined,
  sleep: "sleep" in item ? item.sleep : undefined,
  daily_mood: "daily_mood" in item ? item.daily_mood : undefined,
  daily_health: "daily_health" in item ? item.daily_health : undefined,
}));

const ITEM_IDS = new Set(STORE_ITEMS.map((item) => item.id));

export function storeItem(id: string): StoreItem | undefined {
  return STORE_ITEMS.find((item) => item.id === id);
}

export function defaultShop(): ShopState {
  return { owned: [], pin: null };
}

export function shopOf(state: CareerState): ShopState {
  return state.shop ?? defaultShop();
}

export function normalizeShop(value: unknown): ShopState {
  if (!value || typeof value !== "object") return defaultShop();
  const record = value as Record<string, unknown>;
  const owned = Array.isArray(record.owned)
    ? record.owned.filter((id): id is string => typeof id === "string" && ITEM_IDS.has(id))
    : [];
  const unique: string[] = [];
  for (const id of owned) {
    if (!unique.includes(id)) unique.push(id);
  }
  const pin = typeof record.pin === "string" && ITEM_IDS.has(record.pin) ? record.pin : null;
  return { owned: unique, pin };
}

export function blackFriday(day: number): boolean {
  const index = Math.max(0, day - 1);
  const month = (Math.floor(index / LIFE.days_per_month) % LIFE.months_per_year) + 1;
  const dayOfMonth = (index % LIFE.days_per_month) + 1;
  return LIFE.holidays.some(
    (holiday) =>
      holiday.id === "black_friday" &&
      holiday.month === month &&
      dayOfMonth >= holiday.day &&
      dayOfMonth < holiday.day + holiday.length,
  );
}

export function storePrice(item: StoreItem, day: number): number {
  if (!blackFriday(day)) return item.price;
  return Math.round(item.price * (1 - STORE.black_friday_discount));
}

export function roomOwned(state: CareerState, stage: StageId): boolean {
  if (stage === "student") return true;
  const id = stage === "junior" ? "room_junior" : "room_senior";
  return shopOf(state).owned.includes(id);
}

/** The three largest contributions, matching furniture_cap_per_stat. */
export function cappedSum(values: readonly number[], cap = LIFE.furniture_cap_per_stat): number {
  const ranked = values.filter((value) => value !== 0).sort((a, b) => Math.abs(b) - Math.abs(a));
  let total = 0;
  const count = Math.min(Math.max(0, cap), ranked.length);
  for (let i = 0; i < count; i++) total += ranked[i] ?? 0;
  return total;
}

function benefitValues(state: CareerState, key: "sleep" | "daily_mood" | "daily_health"): number[] {
  const owned = new Set(shopOf(state).owned);
  const stage = state.players.stage;
  const values: number[] = [];

  for (const item of STORE_ITEMS) {
    if (!owned.has(item.id)) continue;

    // Room items only apply in their corresponding stage
    if (item.id === "room_junior" && stage !== "junior") continue;
    if (item.id === "room_senior" && stage !== "senior") continue;

    // Other items with stage restrictions removed in v19 - items apply when owned
    // regardless of room, as long as they have placement in current room or are overlay items

    const value = item[key] ?? 0;
    if (value !== 0) values.push(value);
  }
  return values;
}

export function furnitureSleepBonus(state: CareerState): number {
  return cappedSum(benefitValues(state, "sleep"));
}

export function furnitureDailyMood(state: CareerState): number {
  return cappedSum(benefitValues(state, "daily_mood"));
}

export function furnitureDailyHealth(state: CareerState): number {
  return cappedSum(benefitValues(state, "daily_health"));
}

/** Job accept and retry energy, before the work-streak multiplier. */
export function jobEnergyFactor(state: CareerState): number {
  return shopOf(state).owned.includes("ergo_chair") ? STORE.ergo_energy : 1;
}

/** Study and job XP. Mood scaling happens after this floor. */
export function scaleWorkXp(amount: number, state: CareerState): number {
  if (!(amount > 0)) return 0;
  if (!shopOf(state).owned.includes("monitor2")) return Math.floor(amount);
  return Math.floor(amount * STORE.monitor_xp);
}

export function unlockBlock(state: CareerState, item: StoreItem): string | null {
  if (item.skills != null && item.level != null) {
    const count = state.player_skills.filter((skill) => skill.level >= item.level!).length;
    const skillsOk = count >= item.skills;
    const repOk = item.reputation == null || state.players.reputation >= item.reputation;
    if (!skillsOk || !repOk) {
      if (item.reputation != null) {
        return `Cần ${item.skills} kỹ năng cấp ${item.level} và ${item.reputation} uy tín.`;
      }
      return `Cần ${item.skills} kỹ năng cấp ${item.level}.`;
    }
  }
  return null;
}

export function buyBlock(state: CareerState, id: string): string | null {
  const item = storeItem(id);
  if (!item) return "Không có món này.";
  if (shopOf(state).owned.includes(id)) return "Đã có.";
  const locked = unlockBlock(state, item);
  if (locked) return locked;
  if (state.players.money < storePrice(item, state.players.game_day)) return "Không đủ tiền.";
  return null;
}

export function pinProgress(state: CareerState): { label: string; percent: number } | null {
  const pin = shopOf(state).pin;
  if (!pin) return null;
  const item = storeItem(pin);
  if (!item) return null;
  if (shopOf(state).owned.includes(pin)) return { label: item.label, percent: 100 };
  const price = storePrice(item, state.players.game_day);
  const percent = price <= 0 ? 100 : Math.min(100, Math.floor((state.players.money / price) * 100));
  return { label: item.label, percent };
}

export function pinProgressLine(state: CareerState): string {
  const progress = pinProgress(state);
  if (!progress) return "Chưa ghim món.";
  return `${progress.label} ${progress.percent}%.`;
}

export function pinItem(state: CareerState, id: string | null): CareerState {
  if (id != null && !storeItem(id)) return state;
  return { ...state, shop: { ...shopOf(state), pin: id } };
}

/** Fires once per pinned item. pushNotice keeps the id from repeating. */
export function pinReady(state: CareerState): { id: string; label: string } | null {
  const pin = shopOf(state).pin;
  if (!pin || shopOf(state).owned.includes(pin)) return null;
  const item = storeItem(pin);
  if (!item) return null;
  if (state.players.money < storePrice(item, state.players.game_day)) return null;
  return { id: pin, label: item.label };
}
