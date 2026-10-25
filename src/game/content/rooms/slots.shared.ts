import type { Room, Slot, StageId } from "../../types";

/**
 * The one slot list every room shares. Each room json keeps only its own
 * part (the `default` item per slot and its 2D `anchor`); this module holds
 * the ids, kinds, accepts, parents and labels, so all three rooms always
 * offer the same set of slots and no owned item can end up without a place
 * to go. `buildRoomSlots` merges the two halves and refuses a room whose
 * entry ids are not exactly the shared set.
 */
export type SharedSlotDef = Omit<Slot, "default" | "anchor">;

export const SHARED_SLOT_DEFS: readonly SharedSlotDef[] = [
  { id: "bed", kind: "floor", accepts: ["bed"], label: { en: "Bed", vi: "Giường" }, group: "room" },
  {
    id: "desk",
    kind: "floor",
    accepts: ["desk"],
    required: true,
    label: { en: "Desk", vi: "Bàn" },
    group: "desk",
  },
  {
    id: "under_desk",
    kind: "surface",
    accepts: ["under_desk"],
    parent: "desk",
    socket: "under",
    label: { en: "Under desk", vi: "Dưới bàn" },
    group: "room",
  },
  {
    id: "side_device",
    kind: "surface",
    accepts: ["side_device"],
    parent: "desk",
    socket: "side",
    label: { en: "Side device", vi: "Thiết bị phụ" },
    group: "room",
  },
  {
    id: "display",
    kind: "surface",
    accepts: ["display"],
    parent: "desk",
    socket: "display",
    label: { en: "Screen", vi: "Màn hình" },
    group: "room",
  },
  {
    id: "keyboard",
    kind: "surface",
    accepts: ["keyboard"],
    parent: "desk",
    socket: "keyboard",
    label: { en: "Keyboard", vi: "Bàn phím" },
    group: "room",
  },
  {
    id: "mouse",
    kind: "surface",
    accepts: ["mouse"],
    parent: "desk",
    socket: "mouse",
    label: { en: "Mouse", vi: "Chuột" },
    group: "room",
  },
  {
    id: "cup",
    kind: "surface",
    accepts: ["cup"],
    parent: "desk",
    socket: "cup",
    label: { en: "Cup", vi: "Cốc" },
    group: "room",
  },
  {
    id: "desk_plant",
    kind: "surface",
    accepts: ["desk_plant"],
    parent: "desk",
    socket: "plant",
    label: { en: "Desk plant", vi: "Cây bàn" },
    group: "room",
  },
  {
    id: "gadget",
    kind: "surface",
    accepts: ["gadget"],
    parent: "desk",
    socket: "gadget",
    label: { en: "Gadget", vi: "Thiết bị" },
    group: "room",
  },
  {
    id: "desk_lamp",
    kind: "surface",
    accepts: ["desk_lamp"],
    parent: "desk",
    socket: "lamp",
    label: { en: "Desk lamp", vi: "Đèn bàn" },
    group: "room",
  },
  {
    id: "seat",
    kind: "seat",
    accepts: ["chair"],
    parent: "desk",
    socket: "seat",
    label: { en: "Chair", vi: "Ghế" },
    group: "room",
  },
  {
    id: "cabinet",
    kind: "floor",
    accepts: ["cabinet"],
    label: { en: "Cabinet", vi: "Tủ" },
    group: "room",
  },
  {
    id: "cabinet_top",
    kind: "surface",
    accepts: ["appliance"],
    parent: "cabinet",
    socket: "top",
    label: { en: "On cabinet", vi: "Trên tủ" },
    group: "room",
  },
  {
    id: "cabinet_top_2",
    kind: "surface",
    accepts: ["appliance"],
    parent: "cabinet",
    socket: "top2",
    label: { en: "On cabinet", vi: "Trên tủ" },
    group: "room",
  },
  { id: "shelf", kind: "floor", accepts: ["shelf"], label: { en: "Shelf", vi: "Kệ" }, group: "room" },
  {
    id: "wardrobe",
    kind: "floor",
    accepts: ["wardrobe"],
    label: { en: "Wardrobe", vi: "Tủ" },
    group: "room",
  },
  {
    id: "lounge",
    kind: "floor",
    accepts: ["lounge"],
    label: { en: "Lounge", vi: "Ghế thư giãn" },
    group: "room",
  },
  {
    id: "decor_1",
    kind: "floor",
    accepts: ["floor_decor"],
    label: { en: "Floor decor", vi: "Đồ sàn" },
    group: "room",
  },
  {
    id: "decor_2",
    kind: "floor",
    accepts: ["floor_decor"],
    label: { en: "Floor decor", vi: "Đồ sàn" },
    group: "room",
  },
  {
    id: "decor_3",
    kind: "floor",
    accepts: ["floor_decor"],
    label: { en: "Floor decor", vi: "Đồ sàn" },
    group: "room",
  },
  {
    id: "snack_1",
    kind: "floor",
    accepts: ["cup"],
    label: { en: "Snack", vi: "Đồ ăn" },
    group: "room",
  },
  {
    id: "snack_2",
    kind: "floor",
    accepts: ["cup"],
    label: { en: "Snack", vi: "Đồ ăn" },
    group: "room",
  },
  { id: "rug", kind: "decal", accepts: ["rug"], label: { en: "Rug", vi: "Thảm" }, group: "room" },
  {
    id: "wall_hanging",
    kind: "wall",
    accepts: ["wall_hanging"],
    label: { en: "Wall hanging", vi: "Treo tường" },
    group: "wall",
  },
  {
    id: "wall_art_1",
    kind: "wall",
    accepts: ["wall_art"],
    label: { en: "Wall art", vi: "Trang trí tường" },
    group: "wall",
  },
  {
    id: "wall_art_2",
    kind: "wall",
    accepts: ["wall_art"],
    label: { en: "Wall art", vi: "Trang trí tường" },
    group: "wall",
  },
  {
    id: "aircon",
    kind: "wall",
    accepts: ["aircon"],
    label: { en: "Air conditioner", vi: "Máy lạnh" },
    group: "wall",
  },
];

export type RoomSlotEntry = {
  id: string;
  default: string | null;
  anchor?: [number, number];
};

/**
 * Merge the shared slot defs with one room's per-slot defaults and anchors.
 * Throws when the room's entries are not exactly the shared id set, so a
 * missing or unknown slot fails at load time instead of disabling items in
 * the owned tab.
 */
export function buildRoomSlots(roomId: StageId, entries: readonly RoomSlotEntry[]): Slot[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) throw new Error(`Room ${roomId} lists slot ${entry.id} twice`);
    seen.add(entry.id);
  }
  const expected = new Set(SHARED_SLOT_DEFS.map((def) => def.id));
  for (const id of seen) {
    if (!expected.has(id)) throw new Error(`Room ${roomId} has unknown slot ${id}`);
  }
  for (const id of expected) {
    if (!seen.has(id)) throw new Error(`Room ${roomId} is missing slot ${id}`);
  }
  return SHARED_SLOT_DEFS.map((def) => {
    const entry = byId.get(def.id)!;
    return { ...def, default: entry.default, ...(entry.anchor ? { anchor: entry.anchor } : {}) };
  });
}

/** Used by content/index.ts to keep the parsed room type honest. */
export type RoomWithSharedSlots = Omit<Room, "slots"> & { slots: Slot[] };
