/**
 * Logic for the "Đã sở hữu" (Owned) tab:
 * - List all owned store items + default room furniture
 * - Store furniture is placed into room slots by its store.json `category`
 *   (loadout value `store:<id>`); defaults resolve through CATALOG_SHOP_ICONS
 * - Active state reads the loadout with the same convention as the 3D room
 *   (`slot.id in loadout ? loadout[slot.id] : slot.default`)
 */

import type { StageId } from "@/game/config";
import type { CareerState } from "@/game/career/types";
import type { Category, Loadout } from "@/game/types";
import { getCatalog, getRoom } from "@/game/content";
import { shopOf, storeItem } from "@/game/life/furniture";
import { STORE_SLOT_PREFIX } from "@/game3d/slot-models";

export type OwnedItemStatus = "active" | "inactive";

/**
 * Catalog default id → 3D shop icon id (`public/icons/shop/shop_<id>_256.png`).
 * Only exact-model matches are listed; defaults without a 3D model (bookshelf,
 * wardrobe, armchair, rug, posters, mouse, …) are kept out of the owned tab
 * instead of drawing their old pixel sprites.
 */
const CATALOG_SHOP_ICONS: Record<string, string> = {
  "student.mattress": "mattress",
  "student.folding_table": "table_folding",
  "student.laptop": "laptop",
  "student.kettle": "kettle",
  "student.books_stack": "books_stack",
  "student.fan": "fan_standing",
  "student.bedside_cabinet": "nightstand",
  "student.plastic_stool": "stool_plastic",
  "junior.bed": "bed",
  "junior.desk": "desk",
  "junior.monitor": "monitor",
  "junior.mug": "mug",
  "junior.plant_small": "plant_small",
  "junior.office_chair": "ergo_chair", // closest match — no office_chair GLB
  "senior.ergo_chair": "ergo_chair",
  "senior.plant_small": "plant_small",
};

export type OwnedItemModel = {
  storeId: string;
  catalogId: string;
  label: string;
  icon: string;
  stage?: StageId;
  /** store.json category (store items) — drives slot placement. */
  category?: string;
  status: OwnedItemStatus;
  /** Slot ID where this item is active, or null. */
  activeSlot: string | null;
  /**
   * True when the loadout entry itself points at this item. False for an
   * item that is only active through the room default — clicking those
   * places them explicitly (re-assert) instead of asking for a removal.
   */
  placedExplicitly?: boolean;
  /** True if the current room has no slot accepting this item. */
  noSlotInRoom?: boolean;
};

/**
 * Build the owned item list for the current stage: purchased store items
 * (usable by category) + default room furniture from all stages.
 */
export function getOwnedItems(
  career: CareerState,
  currentStage: StageId,
  loadout: Loadout,
): OwnedItemModel[] {
  const owned = shopOf(career).owned;
  const catalog = getCatalog();
  const room = getRoom(currentStage);

  const result: OwnedItemModel[] = [];
  const catalogItemsSeen = new Set<string>();

  // Purchased store items: placed into slots by their category.
  for (const storeId of owned) {
    const item = storeItem(storeId);
    if (!item) continue;
    // Skip room upgrades (room_junior, room_senior)
    if (storeId === "room_junior" || storeId === "room_senior") continue;

    const acceptingSlots = item.category
      ? findAcceptingSlotsByCategory(item.category, currentStage)
      : [];
    const activeSlot = findStoreActiveSlot(storeId, room.slots, loadout);
    const noSlotInRoom = item.category == null || acceptingSlots.length === 0;

    result.push({
      storeId,
      catalogId: "",
      label: item.label,
      icon: item.icon, // 3D shop icon
      stage: item.stage,
      category: item.category,
      status: activeSlot ? "active" : "inactive",
      activeSlot,
      // Store picks are always explicit loadout entries.
      placedExplicitly: activeSlot != null,
      noSlotInRoom,
    });
  }

  // Default furniture from ALL room stages (not just current).
  const allStages: StageId[] = ["student", "junior", "senior"];
  for (const stageId of allStages) {
    const stageRoom = getRoom(stageId);
    for (const slot of stageRoom.slots) {
      const defaultId = slot.default;
      if (!defaultId || catalogItemsSeen.has(defaultId)) continue;

      const catalogItem = catalog.itemsById.get(defaultId);
      if (!catalogItem) continue;

      // Only defaults with a 3D shop icon show up here — no pixel sprites.
      const shopId = CATALOG_SHOP_ICONS[defaultId];
      if (!shopId) continue;

      // Check if this item can be used in current room
      const acceptingSlots = findAcceptingSlots(defaultId, currentStage);
      const noSlotInRoom = acceptingSlots.length === 0;

      // Check if this is active in current room
      const activeSlot = noSlotInRoom
        ? null
        : findActiveSlot(defaultId, room.slots, loadout);
      const status = activeSlot ? "active" : "inactive";

      result.push({
        storeId: "", // No store item
        catalogId: defaultId,
        label: catalogItem.name.vi,
        icon: `shop_${shopId}.png`, // 3D shop icon
        stage: catalogItem.stage,
        status,
        activeSlot,
        // An untouched slot matches through its room default, not through a
        // loadout entry — clicking such an item must place it explicitly.
        placedExplicitly: activeSlot != null && loadout[activeSlot] === defaultId,
        noSlotInRoom,
      });

      catalogItemsSeen.add(defaultId);
    }
  }

  return result;
}

/** Slot whose loadout entry is this store item (`store:<id>`), if any. */
function findStoreActiveSlot(
  storeId: string,
  slots: readonly { id: string }[],
  loadout: Loadout,
): string | null {
  const wanted = `${STORE_SLOT_PREFIX}${storeId}`;
  for (const slot of slots) {
    if (loadout[slot.id] === wanted) return slot.id;
  }
  return null;
}

/**
 * Find which slot (if any) has this catalog item active. An untouched slot
 * falls back to the room default; an explicit `null` entry is "off".
 */
function findActiveSlot(
  catalogId: string,
  slots: readonly { id: string; default: string | null }[],
  loadout: Loadout,
): string | null {
  for (const slot of slots) {
    const itemId = slot.id in loadout ? loadout[slot.id] : slot.default;
    if (itemId === catalogId) {
      return slot.id;
    }
  }
  return null;
}

/**
 * Find all slots of the current room whose `accepts` contains the category.
 */
export function findAcceptingSlotsByCategory(
  category: string,
  stage: StageId,
): Array<{ id: string; accepts: readonly string[]; required?: boolean }> {
  const room = getRoom(stage);
  return room.slots.filter((slot) =>
    slot.accepts.includes(category as Category),
  );
}

/**
 * Find all slots that accept this catalog item (by its own category).
 */
export function findAcceptingSlots(
  catalogId: string,
  stage: StageId,
): Array<{ id: string; accepts: readonly string[]; required?: boolean }> {
  const catalog = getCatalog();
  const item = catalog.itemsById.get(catalogId);
  if (!item) return [];
  return findAcceptingSlotsByCategory(item.category, stage);
}
