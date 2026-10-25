/**
 * Logic for the "Đã sở hữu" (Owned) tab:
 * - List all owned store items + default room furniture
 * - Store items are categorized as:
 *   1. Replacement items (replaces != null): map to catalog item
 *   2. Overlay items (replaces == null): always active if placed in current stage
 * - Determine active state from loadouts for replacement items, from placement for overlays
 */

import type { StageId } from "@/game/config";
import type { CareerState } from "@/game/career/types";
import type { Loadout, Item, Category } from "@/game/types";
import { getCatalog, getRoom } from "@/game/content";
import { shopOf, storeItem, type StoreItem } from "@/game/life/furniture";
import { placementRows } from "@/game/life/placement";

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
  status: OwnedItemStatus;
  /** Slot ID where this item is active, or null */
  activeSlot: string | null;
  /** True if this is an overlay item (replaces null), can be toggled on/off */
  isOverlay: boolean;
  /** True if this overlay is hidden in current room */
  isHidden?: boolean;
  /** True if current room has no slot accepting this item's category */
  noSlotInRoom?: boolean;
};

/**
 * Build owned item list for the current stage.
 * Includes purchased store items + default room furniture from all stages.
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

  // Add purchased store items (all usable in current room)
  for (const storeId of owned) {
    const item = storeItem(storeId);
    if (!item) continue;

    // Skip room upgrades (room_junior, room_senior)
    if (storeId === "room_junior" || storeId === "room_senior") continue;

    // Find all placement rows for this item across all rooms
    const placementRow = placementRows().find(
      (row) => row.item === storeId && row.room === currentStage
    );

    // Determine if this is a replacement item (maps to catalog) or overlay item
    const catalogId = placementRow?.replaces || "";
    const isOverlay = !catalogId && !!placementRow;

    // Determine status
    let status: OwnedItemStatus;
    let activeSlot: string | null = null;
    let noSlotInRoom = false;

    if (isOverlay) {
      // Overlay items: check if they have placement in current room
      if (placementRow) {
        // Has placement - always "active" (visible unless explicitly hidden)
        status = "active";
      } else {
        // No placement in current room - need to create default placement
        status = "active";
      }
    } else if (catalogId) {
      // Replacement item: check loadout
      const catalogItem = catalog.itemsById.get(catalogId);
      if (!catalogItem) continue;

      const acceptingSlots = findAcceptingSlots(catalogId, currentStage);
      if (acceptingSlots.length === 0) {
        // No slot accepts this item in current room
        noSlotInRoom = true;
        status = "inactive";
      } else {
        activeSlot = findActiveSlot(catalogId, room.slots, loadout);
        status = activeSlot ? "active" : "inactive";
      }

      catalogItemsSeen.add(catalogId);
    } else {
      // No placement and no catalog mapping - shouldn't happen
      status = "inactive";
    }

    result.push({
      storeId,
      catalogId,
      label: item.label,
      icon: item.icon, // Store item uses m5 icon
      stage: item.stage,
      status,
      activeSlot,
      isOverlay,
      noSlotInRoom,
    });
  }

  // Add default furniture from ALL room stages (not just current)
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
      const activeSlot = noSlotInRoom ? null : findActiveSlot(defaultId, room.slots, loadout);
      const status = activeSlot ? "active" : "inactive";

      result.push({
        storeId: "", // No store item
        catalogId: defaultId,
        label: catalogItem.name.vi,
        icon: `shop_${shopId}.png`, // 3D shop icon
        stage: catalogItem.stage,
        status,
        activeSlot,
        isOverlay: false,
        noSlotInRoom,
      });

      catalogItemsSeen.add(defaultId);
    }
  }

  return result;
}

/**
 * Find which slot (if any) has this catalog item active.
 */
function findActiveSlot(
  catalogId: string,
  slots: readonly { id: string; default: string | null }[],
  loadout: Loadout,
): string | null {
  for (const slot of slots) {
    const itemId = loadout[slot.id] ?? slot.default;
    if (itemId === catalogId) {
      return slot.id;
    }
  }
  return null;
}

/**
 * Find all slots that accept this item's category.
 */
export function findAcceptingSlots(
  catalogId: string,
  stage: StageId,
): Array<{ id: string; accepts: Category[]; required?: boolean }> {
  const catalog = getCatalog();
  const item = catalog.itemsById.get(catalogId);
  if (!item) return [];

  const room = getRoom(stage);
  return room.slots.filter((slot) => slot.accepts.includes(item.category));
}

