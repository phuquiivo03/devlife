import { STORE_TO_KEY } from "./assets";
import { STORE_ITEMS, type StoreItem } from "@/game/life/furniture";
import type { StageId } from "@/game/config";

/**
 * Slot-driven furniture resolution for the 3D room.
 *
 * The shipped manifest stays the baseline: when a slot has no loadout entry,
 * the room looks exactly as it did before loadouts mattered (base model, or
 * the owned-gated store item that auto-replaces it). A loadout entry then
 * overrides the slot — `null` empties it, a catalog id or a `store:<id>`
 * value renders that item's GLB instead.
 *
 * A GLB is drawn when the slot holding its loadout entry says so (or its
 * untouched default allows it) and nothing hid it — `drawn` wins over
 * `hidden`, so two slots of the same category (the three floor_decor slots,
 * say) never fight over each other's picks.
 */

export const STORE_SLOT_PREFIX = "store:";

export type SlotLike = {
  id: string;
  accepts: readonly string[];
  default: string | null;
};

export type LoadoutLike = Record<string, string | null>;

/**
 * First slot accepting `category` that the loadout has not touched (no entry
 * at all — an explicit pick, including `null`, is a player choice and stays).
 * Migration and the buy flow use this to auto-place store items without
 * ever overwriting a choice. Null when every accepting slot has an entry.
 */
export function firstUntouchedAcceptingSlot(
  slots: readonly SlotLike[],
  loadout: LoadoutLike,
  category: string,
): SlotLike | null {
  return (
    slots.find((slot) => slot.accepts.includes(category) && !(slot.id in loadout)) ?? null
  );
}

/** Catalog item id → GLB key. Student picks draw the shipped models; every
 * junior/senior default maps to its own GLB from art/3d/room_defaults_v1
 * (junior bed/desk/monitor/mug and senior ergo chair/plant reuse shipped
 * student models, drawer_pedestal is shared by both rooms). */
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
  "junior.office_chair": "junior_office_chair",
  "junior.bookshelf": "junior_bookshelf",
  "junior.drawer_pedestal": "drawer_pedestal",
  "junior.keyboard_mat": "junior_keyboard_mat",
  "junior.laptop_stand": "junior_laptop_stand",
  "junior.mouse": "junior_mouse",
  "junior.poster_1": "junior_poster_1",
  "junior.poster_2": "junior_poster_2",
  "junior.wardrobe": "junior_wardrobe",
  "senior.ergo_chair": "ergo_chair",
  "senior.plant_small": "plant_small",
  "senior.armchair": "senior_armchair",
  "senior.bookshelf": "senior_bookshelf",
  "senior.coffee_grinder": "senior_coffee_grinder",
  "senior.dual_monitor": "senior_dual_monitor",
  "senior.drawer_pedestal": "drawer_pedestal",
  "senior.espresso_machine": "senior_espresso_machine",
  "senior.frame_1": "senior_frame_1",
  "senior.frame_2": "senior_frame_2",
  "senior.keyboard_mat": "senior_keyboard_mat",
  "senior.monstera": "senior_monstera",
  "senior.rug": "senior_rug",
  "senior.sideboard": "senior_sideboard",
  "senior.smart_speaker": "senior_smart_speaker",
  "senior.standing_desk": "senior_standing_desk",
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

/**
 * Categories whose variants share one physical spot — picking one hides the
 * others (bed/bed_vip/mat all stand where the bed is). floor_decor is NOT one:
 * fan, books and plants each have their own corner, so they coexist.
 */
const SHARED_SPOT_CATEGORIES: ReadonlySet<string> = new Set([
  "bed",
  "chair",
  "display",
  "keyboard",
  "cup",
  "desk",
  "appliance",
  "cabinet",
  "desk_plant",
]);

/**
 * Catalog entries that swap the slot base: draw at floor level, not overlay.
 * Keyed per stage — a pick's replacement spot follows that room's layout.
 */
const POSITION_OVERRIDES_BY_STAGE: Record<StageId, Record<string, [number, number, number]>> = {
  student: {
    // "Floor mattress" as the bed-slot pick: mattress GLB's manifest spot is
    // the overlay on the wooden bed — as a replacement it sits on the floor.
    "student.mattress": [-0.315, 0.02, -1.445],
  },
  junior: {
    // "Floor mattress" as the bed-slot pick: mattress GLB's manifest spot is
    // the overlay on the junior bed — as a replacement it lies on the floor
    // at the bed spot (left wall, rotated like the bed).
    "student.mattress": [-1.45, 0.02, 1.05],
  },
  senior: {
    // Senior ships bedless; a floor-mattress pick claims the bed zone at the
    // front-centre (the only clear floor for a 1.9 m bed in this layout).
    "student.mattress": [-0.465, 0.02, 1.35],
  },
};

/** Laptop GLB spots per room: on the folding table vs on the desk (the display's place). */
const LAPTOP_SPOTS: Record<
  StageId,
  { folding: [number, number, number]; desk: [number, number, number] }
> = {
  student: { folding: [-1.535, 0.32, -0.1], desk: [-1.76, 0.74, -0.12] },
  junior: { folding: [-1.535, 0.32, -0.95], desk: [-1.78, 0.74, -0.95] },
  senior: { folding: [-1.645, 0.32, -0.35], desk: [-1.83, 0.74, -0.55] },
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
  /** GLB keys the room draws (their slots decided so). */
  drawn: Set<string>;
  /** GLB keys explicitly hidden (emptied slot / replaced by a pick). */
  hidden: Set<string>;
  /** GLB key → position taken from the manifest. */
  positionOverrides: Record<string, [number, number, number]>;
};

/**
 * Resolve which manifest keys each slot draws. Slots not touched by the
 * loadout reproduce the pre-loadout scene (base model, owned auto-replaces
 * and overlays); a touched slot draws exactly its entry — `null` empties it,
 * an entry without a GLB keeps the untouched look.
 *
 * Junior/senior have no shipped baseline of their own (their stage0 is
 * empty), so there the room default of an untouched slot draws like an entry
 * — `null` hides the base, a catalog id renders its GLB. Student keeps the
 * manifest-as-baseline grammar: its defaults never draw on their own.
 */
export function resolveRoomFurniture(
  slots: readonly SlotLike[],
  loadout: LoadoutLike,
  owned: ReadonlySet<string>,
  stage: StageId = "student",
): RoomFurniturePlan {
  const drawn = new Set<string>();
  const hidden = new Set<string>();
  const positionOverrides: RoomFurniturePlan["positionOverrides"] = {};
  const overrides = POSITION_OVERRIDES_BY_STAGE[stage];
  const useDefaults = stage !== "student";

  // Which GLB each loadout entry actually draws (owned picks only) — a pick
  // belongs to its slot and other slots must not hide it.
  const placed = new Map<string, string>();
  for (const slot of slots) {
    const entry = loadout[slot.id];
    if (entry == null) continue;
    const { glb, storeId } = glbForEntry(entry);
    if (!glb) continue;
    if (storeId != null && !owned.has(storeId)) continue;
    placed.set(glb, slot.id);
  }

  const applyUntouched = (slot: SlotLike): boolean => {
    const base = SLOT_BASE_MODEL[slot.id];
    let replaced = false;
    for (const item of slotStoreItems(slot.accepts)) {
      if (!owned.has(item.id)) continue;
      const glb = STORE_TO_KEY[item.id];
      if (!glb) continue;
      // Owned auto-replacements swap the base while the slot is untouched;
      // every other owned variant shows at its own spot through the default
      // rule (owned-gated → visible), unless it was hidden elsewhere.
      if (AUTO_REPLACE.has(item.id) && !placed.has(glb)) {
        if (base) hidden.add(base);
        drawn.add(glb);
        replaced = true;
      }
    }
    return replaced;
  };

  const hideBaseAndFamily = (slot: SlotLike) => {
    // Emptied slot: hide the base and the unplaced family members that
    // share its spot (a pick placed in a sibling slot keeps drawing).
    const base = SLOT_BASE_MODEL[slot.id];
    if (base) hidden.add(base);
    if (SHARED_SPOT_CATEGORIES.has(slot.accepts[0] ?? "")) {
      for (const item of slotStoreItems(slot.accepts)) {
        const glb = STORE_TO_KEY[item.id];
        if (glb && !placed.has(glb)) hidden.add(glb);
      }
    }
  };

  const drawEntry = (slot: SlotLike, entry: string) => {
    const base = SLOT_BASE_MODEL[slot.id];
    const { glb, storeId } = glbForEntry(entry);
    // An unowned store pick or a catalog entry without a GLB keeps the slot
    // looking untouched instead of vanishing.
    if (!glb || (storeId != null && !owned.has(storeId))) {
      applyUntouched(slot);
      return;
    }
    drawn.add(glb);
    const overlay = storeId != null && STORE_OVERLAY.has(storeId);
    const shared = SHARED_SPOT_CATEGORIES.has(slot.accepts[0] ?? "");
    if (!overlay && base && base !== glb) hidden.add(base);
    if (shared) {
      // Same-spot siblings yield to this pick unless they are placed
      // elsewhere (that slot's own entry draws them).
      for (const item of slotStoreItems(slot.accepts)) {
        const other = STORE_TO_KEY[item.id];
        if (!other || other === glb) continue;
        if (!placed.has(other)) hidden.add(other);
      }
    }
    const override = overrides[entry];
    if (override) positionOverrides[glb] = override;
    if (entry === "student.laptop") {
      // The laptop follows whichever desk is actually drawn: on the folding
      // table it stays low; on a real desk it takes the monitor's place so
      // it never floats above the low table.
      const deskSlot = slots.find((s) => s.id === "desk");
      const deskEntry = deskSlot
        ? deskSlot.id in loadout
          ? loadout[deskSlot.id]
          : useDefaults
            ? deskSlot.default
            : null
        : null;
      const spots = LAPTOP_SPOTS[stage];
      positionOverrides.laptop =
        deskEntry === "student.folding_table" ? spots.folding : spots.desk;
    }
  };

  for (const slot of slots) {
    if (!(slot.id in loadout)) {
      if (applyUntouched(slot)) continue;
      if (useDefaults) {
        if (slot.default === null) hideBaseAndFamily(slot);
        else if (slot.default != null) drawEntry(slot, slot.default);
      }
      continue;
    }
    const entry = loadout[slot.id];
    if (entry === null) {
      hideBaseAndFamily(slot);
      continue;
    }
    drawEntry(slot, entry);
  }

  return { drawn, hidden, positionOverrides };
}
