import { isOwnedOnly, STORE_TO_KEY } from "./assets";
import { STORE_ITEMS, type StoreItem } from "@/game/life/furniture";

/**
 * Slot-driven furniture resolution for the 3D room.
 *
 * The shipped manifest stays the baseline: when a slot has no loadout entry,
 * the room looks exactly as it did before loadouts mattered (base model, or
 * the owned-gated store item that auto-replaces it). A loadout entry then
 * overrides the slot — `null` empties it, a catalog id or a `store:<id>`
 * value renders that item's GLB instead.
 */

export const STORE_SLOT_PREFIX = "store:";

export type SlotLike = {
  id: string;
  accepts: readonly string[];
  default: string | null;
};

export type LoadoutLike = Record<string, string | null>;

/** Catalog item id → GLB key: exact model matches plus the closest shipped one. */
export const CATALOG_TO_GLB: Record<string, string> = {
  "student.mattress": "mattress",
  "student.folding_table": "table_folding",
  "student.plastic_stool": "stool_plastic",
  "student.laptop": "laptop",
  "student.kettle": "kettle",
  "student.books_stack": "books_stack",
  "student.fan": "fan_standing",
  "student.bedside_cabinet": "nightstand",
  "student.noodle_cup": "cup",
  "junior.bed": "bed",
  "junior.desk": "desk",
  "junior.monitor": "monitor",
  "junior.mug": "mug",
  "junior.plant_small": "plant_small",
  "junior.office_chair": "ergo_chair", // no office_chair GLB — ergo is the closest
  "senior.ergo_chair": "ergo_chair",
  "senior.plant_small": "plant_small",
};

/**
 * Slot id → manifest GLB key drawn when the loadout leaves the slot alone.
 * Slots without an entry stay invisible (no GLB exists for them yet).
 */
export const SLOT_BASE_MODEL: Record<string, string> = {
  bed: "bed",
  desk: "desk",
  seat: "chair_plastic",
  display: "monitor",
  keyboard: "keyboard",
  cup: "cup",
  cabinet: "nightstand",
  cabinet_top: "kettle",
  decor_1: "fan_standing",
  decor_3: "books_stack",
  desk_plant: "plant_small",
};

/** Store items that draw on top of the slot base instead of replacing it. */
const STORE_OVERLAY: ReadonlySet<string> = new Set(["mattress", "monitor2"]);

/** Owned items that auto-replace the slot base while the loadout is untouched. */
const AUTO_REPLACE: ReadonlySet<string> = new Set(["ergo_chair", "bed_vip"]);

/** Catalog entries that swap the slot base: draw at floor level, not overlay. */
export const POSITION_OVERRIDES: Record<string, [number, number, number]> = {
  // "Floor mattress" as the bed-slot pick: mattress GLB's manifest spot is the
  // overlay on the wooden bed — as a replacement it sits on the floor instead.
  "student.mattress": [-0.315, 0.02, -1.445],
  // Laptop as the display pick: its stage0 spot is on the low folding table —
  // as a replacement for the monitor it sits on the desk surface instead.
  "student.laptop": [-1.52, 0.745, -0.12],
};

function slotStoreItems(accepts: readonly string[]): StoreItem[] {
  return STORE_ITEMS.filter(
    (item) => item.category != null && accepts.includes(item.category),
  );
}

function glbForEntry(entry: string): { glb: string | null; storeId: string | null } {
  if (entry.startsWith(STORE_SLOT_PREFIX)) {
    const storeId = entry.slice(STORE_SLOT_PREFIX.length);
    return { glb: STORE_TO_KEY[storeId] ?? null, storeId };
  }
  return { glb: CATALOG_TO_GLB[entry] ?? null, storeId: null };
}

export type RoomFurniturePlan = {
  /** GLB key → visible. Only slot-bound keys appear here. */
  visible: Record<string, boolean>;
  /** GLB key → position taken from the manifest. */
  positionOverrides: Record<string, [number, number, number]>;
};

/**
 * Resolve which manifest keys each slot draws. Slots not touched by the
 * loadout reproduce the pre-loadout scene (base model, owned auto-replaces
 * and overlays); a touched slot draws exactly its entry — `null` empties it,
 * an entry without a GLB keeps the untouched look.
 */
export function resolveRoomFurniture(
  slots: readonly SlotLike[],
  loadout: LoadoutLike,
  owned: ReadonlySet<string>,
): RoomFurniturePlan {
  const visible: Record<string, boolean> = {};
  const positionOverrides: RoomFurniturePlan["positionOverrides"] = {};

  const applyUntouched = (slot: SlotLike) => {
    const base = SLOT_BASE_MODEL[slot.id];
    if (base) visible[base] = !isOwnedOnly(base) || owned.has(base);
    for (const item of slotStoreItems(slot.accepts)) {
      if (!owned.has(item.id)) continue;
      const glb = STORE_TO_KEY[item.id];
      if (!glb) continue;
      if (AUTO_REPLACE.has(item.id) && base) visible[base] = false;
      visible[glb] = true;
    }
  };

  const emptySlot = (slot: SlotLike) => {
    const base = SLOT_BASE_MODEL[slot.id];
    if (base) visible[base] = false;
    for (const item of slotStoreItems(slot.accepts)) {
      const glb = STORE_TO_KEY[item.id];
      if (glb) visible[glb] = false;
    }
  };

  for (const slot of slots) {
    if (!(slot.id in loadout)) {
      applyUntouched(slot);
      continue;
    }
    const entry = loadout[slot.id];
    if (entry === null) {
      emptySlot(slot);
      continue;
    }
    const { glb, storeId } = glbForEntry(entry);
    // An unowned store pick or a catalog entry without a GLB keeps the slot
    // looking untouched instead of vanishing.
    if (!glb || (storeId != null && !owned.has(storeId))) {
      applyUntouched(slot);
      continue;
    }
    const base = SLOT_BASE_MODEL[slot.id];
    const overlay = storeId != null && STORE_OVERLAY.has(storeId);
    for (const key of [
      base,
      ...slotStoreItems(slot.accepts).map((item) => STORE_TO_KEY[item.id]),
    ]) {
      // Overlays keep their base; replacements hide it.
      if (key && key !== glb && !(overlay && key === base)) visible[key] = false;
    }
    visible[glb] = true;
    if (overlay && base) visible[base] = true;
    const override = POSITION_OVERRIDES[entry];
    if (override) positionOverrides[glb] = override;
  }

  return { visible, positionOverrides };
}
