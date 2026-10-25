import { describe, expect, it } from "vitest";
import { getCatalog, getRoom } from "@/game/content";
import { SHARED_SLOT_DEFS } from "@/game/content/rooms/slots.shared";
import { PERSIST_VERSION, STAGES } from "@/game/config";
import { defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import { rollTrait } from "@/game/life/traits";
import type { Category } from "@/game/types";
import { STORE_ITEMS } from "@/game/life/furniture";
import { CATALOG_SHOP_ICONS, getOwnedItems } from "@/components/game/owned-items";
import {
  firstUntouchedAcceptingSlot,
  resolveRoomFurniture,
  STORE_SLOT_PREFIX,
} from "@/game3d/slot-models";

const slotSignature = (slots: readonly { id: string; accepts: readonly string[] }[]) =>
  slots.map((slot) => `${slot.id}:${slot.accepts.join("+")}`).join("|");

describe("shared room slots", () => {
  it("gives every room the same slot ids and accepts", () => {
    const student = slotSignature(getRoom("student").slots);
    for (const stage of ["junior", "senior"] as const) {
      expect(slotSignature(getRoom(stage).slots)).toBe(student);
    }
    expect(slotSignature(SHARED_SLOT_DEFS)).toBe(student);
  });

  it("keeps exactly one required desk per room", () => {
    for (const stage of STAGES) {
      const desks = getRoom(stage).slots.filter((slot) => slot.id === "desk");
      expect(desks).toHaveLength(1);
      expect(desks[0]?.required).toBe(true);
    }
  });

  it("accepts every store furniture item in every room", () => {
    const furniture = STORE_ITEMS.filter((item) => item.category != null && !item.stage);
    // Aircon and lamp_desk used to be the category-less stragglers.
    expect(furniture.map((item) => item.id)).toEqual(
      expect.arrayContaining(["aircon", "lamp_desk"]),
    );
    for (const stage of STAGES) {
      const slots = getRoom(stage).slots;
      for (const item of furniture) {
        expect(
          slots.some((slot) => slot.accepts.includes(item.category as Category)),
          `${stage} has no slot for ${item.id}`,
        ).toBe(true);
      }
    }
  });

  it("accepts every owned-tab catalog default in every room", () => {
    const catalog = getCatalog();
    for (const stage of STAGES) {
      const slots = getRoom(stage).slots;
      for (const catalogId of Object.keys(CATALOG_SHOP_ICONS)) {
        const item = catalog.itemsById.get(catalogId);
        expect(item, catalogId).toBeDefined();
        expect(
          slots.some((slot) => slot.accepts.includes(item!.category)),
          `${stage} has no slot for ${catalogId}`,
        ).toBe(true);
      }
    }
  });

  it("accepts every catalog item in every room", () => {
    const catalog = getCatalog();
    for (const stage of STAGES) {
      const slots = getRoom(stage).slots;
      for (const item of catalog.items) {
        expect(
          slots.some((slot) => slot.accepts.includes(item.category)),
          `${stage} has no slot for ${item.id}`,
        ).toBe(true);
      }
    }
  });

  it("locks no owned card in any room", () => {
    const owned = STORE_ITEMS.filter((item) => !item.stage).map((item) => item.id);
    const career = {
      ...defaultCareer(1, 360, "student", SIM_CATALOG, rollTrait()),
      shop: { owned, pin: null },
    };
    for (const stage of STAGES) {
      const items = getOwnedItems(career, stage, {});
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.noSlotInRoom ?? false, `${stage} ${item.storeId || item.catalogId}`).toBe(false);
      }
    }
  });

  it("bumps the persist version for the shared-slot migration", () => {
    expect(PERSIST_VERSION).toBeGreaterThanOrEqual(23);
  });
});

describe("loadout-only store items", () => {
  const OWNED = (ids: string[]) => new Set(ids);

  it("draws aircon and lamp_desk from their slots, not from ownership", () => {
    const slots = getRoom("student").slots;
    const plan = resolveRoomFurniture(
      slots,
      { aircon: `${STORE_SLOT_PREFIX}aircon`, desk_lamp: `${STORE_SLOT_PREFIX}lamp_desk` },
      OWNED(["aircon", "lamp_desk"]),
    );
    expect(plan.drawn.has("aircon")).toBe(true);
    expect(plan.drawn.has("lamp_desk")).toBe(true);

    // Owned but unplaced: invisible — the room renders from the loadout only.
    const untouched = resolveRoomFurniture(slots, {}, OWNED(["aircon", "lamp_desk"]));
    expect(untouched.drawn.has("aircon")).toBe(false);
    expect(untouched.hidden.has("aircon")).toBe(false);
    expect(untouched.drawn.has("lamp_desk")).toBe(false);
    expect(untouched.hidden.has("lamp_desk")).toBe(false);
  });

  it("spreads same-category picks across the free slots", () => {
    // Three owned floor_decor items land in decor_1..3, not on top of each other.
    const slots = getRoom("junior").slots;
    const plan = resolveRoomFurniture(
      slots,
      {
        decor_1: `${STORE_SLOT_PREFIX}plant_big`,
        decor_2: `${STORE_SLOT_PREFIX}fan_standing`,
        decor_3: `${STORE_SLOT_PREFIX}books_stack`,
      },
      OWNED(["plant_big", "fan_standing", "books_stack"]),
    );
    expect(plan.drawn.has("plant_big")).toBe(true);
    expect(plan.drawn.has("fan_standing")).toBe(true);
    expect(plan.drawn.has("books_stack")).toBe(true);
  });
});

describe("firstUntouchedAcceptingSlot", () => {
  it("prefers the first accepting slot the loadout has not touched", () => {
    const slots = getRoom("student").slots;
    expect(firstUntouchedAcceptingSlot(slots, {}, "floor_decor")?.id).toBe("decor_1");
    // An explicit null is still a choice — the helper moves on.
    expect(
      firstUntouchedAcceptingSlot(slots, { decor_1: null }, "floor_decor")?.id,
    ).toBe("decor_2");
    const bedTaken = Object.fromEntries(
      slots.filter((slot) => slot.accepts.includes("bed")).map((slot) => [slot.id, null]),
    );
    expect(firstUntouchedAcceptingSlot(slots, bedTaken, "bed")).toBeNull();
  });
});
