/**
 * Store tabs. The catalog rows in `config/store.json` have no category
 * field: a room is a row with a stage (or a `room_` id). Everything else
 * is furniture. Display order puts furniture before rooms, which is the
 * grid in the store mockup.
 */

export const STORE_TABS = [
  { id: "furniture", label: "Nội thất" },
  { id: "room", label: "Phòng" },
  { id: "all", label: "Tất cả" },
] as const;

export type StoreTabId = (typeof STORE_TABS)[number]["id"];
export type StoreShelf = "furniture" | "room";

export type StoreShelfItem = {
  id: string;
  stage?: string;
};

export function storeShelf(item: StoreShelfItem): StoreShelf {
  if (item.stage != null && item.stage.length > 0) return "room";
  if (item.id.startsWith("room_")) return "room";
  return "furniture";
}

export function filterStoreItems<T extends StoreShelfItem>(items: readonly T[], tab: StoreTabId): T[] {
  const furniture: T[] = [];
  const rooms: T[] = [];
  for (const item of items) {
    const shelf = storeShelf(item);
    if (tab !== "all" && shelf !== tab) continue;
    if (shelf === "room") rooms.push(item);
    else furniture.push(item);
  }
  if (tab === "room") return rooms;
  if (tab === "furniture") return furniture;
  return [...furniture, ...rooms];
}

/**
 * One action row per cell.
 * Owned reads “Đã có”. A requirement lock keeps “Ghim” and hides buy.
 * Short on money still shows “Mua” (disabled) and keeps “Ghim”, so a
 * savings pin still works. Buy and pin call the existing shop actions.
 */
export function storeCardAction(flags: {
  owned: boolean;
  locked: boolean;
  canBuy: boolean;
}): { buy: "buy" | "owned" | "hidden"; pin: boolean } {
  if (flags.owned) return { buy: "owned", pin: false };
  if (flags.locked) return { buy: "hidden", pin: true };
  if (!flags.canBuy) return { buy: "buy", pin: true };
  return { buy: "buy", pin: false };
}
