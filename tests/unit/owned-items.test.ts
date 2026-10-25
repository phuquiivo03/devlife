import { describe, expect, it } from "vitest";
import {
  getOwnedItems,
  findAcceptingSlots,
  findAcceptingSlotsByCategory,
} from "@/components/game/owned-items";
import type { CareerState } from "@/game/career/types";
import type { Loadout } from "@/game/types";
import { defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import { rollTrait } from "@/game/life/traits";

describe("Owned Items Tab", () => {
  const mockCareer = (
    owned: string[] = ["plant_big", "fan_standing"],
  ): CareerState => {
    const career = defaultCareer(1, 360, "student", SIM_CATALOG, rollTrait());
    return {
      ...career,
      shop: {
        owned,
        pin: null,
      },
    };
  };

  it("lists owned store items", () => {
    const career = mockCareer();
    const loadout: Loadout = {};
    const items = getOwnedItems(career, "student", loadout);

    // Should include default room furniture + owned store items
    expect(items.length).toBeGreaterThan(0);
    const catalogIds = items.map((i) => i.catalogId);
    expect(catalogIds.length).toBeGreaterThan(0);
  });

  it("marks active items correctly", () => {
    const career = mockCareer();
    const loadout: Loadout = {
      desk: "student.folding_table",
      seat: "student.plastic_stool",
    };
    const items = getOwnedItems(career, "student", loadout);

    const desk = items.find((i) => i.catalogId === "student.folding_table");
    expect(desk?.status).toBe("active");
    expect(desk?.activeSlot).toBe("desk");

    const stool = items.find((i) => i.catalogId === "student.plastic_stool");
    if (stool) {
      expect(stool.status).toBe("active");
      expect(stool.activeSlot).toBe("seat");
    }
  });

  it("marks inactive items correctly", () => {
    const career = mockCareer();
    const loadout: Loadout = {
      desk: "student.folding_table",
      // Leave seat empty, so plastic_stool (if it exists as default) would be inactive
    };
    const items = getOwnedItems(career, "student", loadout);

    expect(items.length).toBeGreaterThan(0);
    const activeCount = items.filter((i) => i.status === "active").length;
    expect(activeCount).toBeGreaterThan(0);

    for (const item of items.filter((i) => i.status === "inactive")) {
      expect(item.activeSlot).toBeNull();
    }
  });

  it("marks wrong-stage items correctly", () => {
    const career = mockCareer(["room_junior", "plant_big"]);
    const items = getOwnedItems(career, "student", {});

    // room_junior should not appear in student stage (room upgrade, not furniture)
    const juniorRoom = items.find((i) => i.storeId === "room_junior");
    expect(juniorRoom).toBeUndefined();
  });

  it("finds accepting slots for catalog items", () => {
    const slots = findAcceptingSlots("student.plastic_stool", "student");
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s) => s.accepts.includes("chair"))).toBe(true);
  });

  it("finds accepting slots for a store category", () => {
    const slots = findAcceptingSlotsByCategory("bed", "student");
    expect(slots.some((s) => s.id === "bed")).toBe(true);
  });

  it("identifies required slots", () => {
    const slots = findAcceptingSlots("student.folding_table", "student");
    expect(slots.length).toBeGreaterThan(0);
    const deskSlot = slots.find((s) => s.accepts.includes("desk"));
    expect(deskSlot?.required).toBe(true);
  });

  it("handles items with no accepting slots", () => {
    const slots = findAcceptingSlots("nonexistent.item", "student");
    expect(slots).toEqual([]);
  });

  it("includes default room furniture", () => {
    const career = mockCareer();
    const items = getOwnedItems(career, "student", {});
    expect(items.length).toBeGreaterThan(0);
  });

  it("reports store furniture per slot and honors the ownership rule", () => {
    // Unplaced store furniture reads "Chưa dùng"; aircon has no slot at all.
    const idle = getOwnedItems(
      mockCareer(["bed_vip", "mattress", "aircon"]),
      "student",
      {},
    );
    const vip = idle.find((i) => i.storeId === "bed_vip");
    expect(vip?.status).toBe("inactive");
    expect(vip?.category).toBe("bed");
    const aircon = idle.find((i) => i.storeId === "aircon");
    expect(aircon?.noSlotInRoom).toBe(true);

    // Placing them writes `store:` entries into the loadout.
    const placed = getOwnedItems(
      mockCareer(["bed_vip", "mattress"]),
      "student",
      { bed: "store:bed_vip" } as Loadout,
    );
    const vipPlaced = placed.find((i) => i.storeId === "bed_vip");
    expect(vipPlaced?.status).toBe("active");
    expect(vipPlaced?.activeSlot).toBe("bed");
    const mattress = placed.find((i) => i.storeId === "mattress");
    expect(mattress?.status).toBe("inactive");
  });

  it("distinguishes default-active from explicitly placed items", () => {
    // Fresh save: the folding table is active through the room default.
    const fresh = getOwnedItems(mockCareer(), "student", {});
    const table = fresh.find((i) => i.catalogId === "student.folding_table");
    expect(table?.status).toBe("active");
    expect(table?.activeSlot).toBe("desk");
    expect(table?.placedExplicitly).toBe(false);

    // A store pick only counts as explicit once its loadout entry exists.
    const idleStore = getOwnedItems(mockCareer(["bed_vip"]), "student", {});
    expect(
      idleStore.find((i) => i.storeId === "bed_vip")?.placedExplicitly,
    ).toBe(false);
    const placedStore = getOwnedItems(mockCareer(["bed_vip"]), "student", {
      bed: "store:bed_vip",
    } as Loadout);
    expect(
      placedStore.find((i) => i.storeId === "bed_vip")?.placedExplicitly,
    ).toBe(true);

    // Placing the default item explicitly flips the flag.
    const placed = getOwnedItems(mockCareer(), "student", {
      desk: "student.folding_table",
    });
    expect(
      placed.find((i) => i.catalogId === "student.folding_table")
        ?.placedExplicitly,
    ).toBe(true);
  });

  it("shows default items from all rooms", () => {
    const career = mockCareer();
    const items = getOwnedItems(career, "student", {});

    // Should include items from junior and senior rooms too
    expect(items.some((i) => i.catalogId.startsWith("junior."))).toBe(true);
    expect(items.some((i) => i.catalogId.startsWith("senior."))).toBe(true);
  });

  it("hides defaults without a 3D model and maps the rest to shop icons", () => {
    const career = mockCareer();
    const items = getOwnedItems(career, "student", {});
    const ids = items.map((i) => i.catalogId);

    // No pixel sprites: defaults without a 3D model are kept out entirely.
    expect(ids).not.toContain("student.backpack");
    expect(ids).not.toContain("student.noodle_cup");
    expect(ids).not.toContain("junior.bookshelf");
    expect(ids).not.toContain("senior.armchair");

    // Exact-model matches render from the 3D shop icon set.
    const table = items.find((i) => i.catalogId === "student.folding_table");
    expect(table?.icon).toBe("shop_table_folding.png");
    const mattress = items.find((i) => i.catalogId === "student.mattress");
    expect(mattress?.icon).toBe("shop_mattress.png");
    const juniorBed = items.find((i) => i.catalogId === "junior.bed");
    expect(juniorBed?.icon).toBe("shop_bed.png");
    for (const item of items) {
      expect(item.icon.startsWith("shop_")).toBe(true);
    }
  });
});
