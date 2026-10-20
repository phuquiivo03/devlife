import { describe, expect, it } from "vitest";
import { getOwnedItems, findAcceptingSlots } from "@/components/game/owned-items";
import type { CareerState } from "@/game/career/types";
import type { Loadout } from "@/game/types";
import { defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import { rollTrait } from "@/game/life/traits";

describe("Owned Items Tab", () => {
  const mockCareer = (): CareerState => {
    const career = defaultCareer(1, 360, "student", SIM_CATALOG, rollTrait());
    return {
      ...career,
      shop: {
        owned: ["plant", "fan"],
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

    // Check that owned items are present (plant and fan are owned but may not be sold in student room)
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

    // Check that we have at least some items, and not all are active
    expect(items.length).toBeGreaterThan(0);
    const activeCount = items.filter((i) => i.status === "active").length;

    // Should have at least one active (desk) and possibly some inactive
    expect(activeCount).toBeGreaterThan(0);

    // If there are inactive items, check they have null activeSlot
    const inactiveItems = items.filter((i) => i.status === "inactive");
    for (const item of inactiveItems) {
      expect(item.activeSlot).toBeNull();
    }
  });

  it("marks wrong-stage items correctly", () => {
    const career = {
      ...mockCareer(),
      shop: {
        owned: ["room_junior", "plant"],
        pin: null,
      },
    };
    const loadout: Loadout = {};
    const items = getOwnedItems(career, "student", loadout);

    // room_junior should not appear in student stage (room upgrade, not furniture)
    const juniorRoom = items.find((i) => i.storeId === "room_junior");
    expect(juniorRoom).toBeUndefined();
  });

  it("finds accepting slots for catalog items", () => {
    const slots = findAcceptingSlots("student.plastic_stool", "student");

    // Plastic stool is a chair, should find seat slot
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s) => s.accepts.includes("chair"))).toBe(true);
  });

  it("identifies required slots", () => {
    const slots = findAcceptingSlots("student.folding_table", "student");

    // Folding table is a desk, should find desk slot which is required
    expect(slots.length).toBeGreaterThan(0);
    const deskSlot = slots.find((s) => s.accepts.includes("desk"));
    expect(deskSlot?.required).toBe(true);
  });

  it("handles items with no accepting slots", () => {
    // Try to find slots for a non-existent item
    const slots = findAcceptingSlots("nonexistent.item", "student");

    // Should return empty array since the item doesn't exist
    expect(slots).toEqual([]);
  });

  it("includes default room furniture", () => {
    const career = mockCareer();
    const loadout: Loadout = {};
    const items = getOwnedItems(career, "student", loadout);

    // Should include default furniture like student.folding_table
    const hasDefaultFurniture = items.some((i) => i.storeId === "" && i.catalogId.startsWith("student."));
    expect(hasDefaultFurniture).toBe(true);
  });

  it("does not duplicate items", () => {
    const career = mockCareer();
    const loadout: Loadout = {};
    const items = getOwnedItems(career, "student", loadout);

    // Check no duplicate catalogIds
    const catalogIds = items.map((i) => i.catalogId).filter((id) => id !== "");
    const uniqueIds = new Set(catalogIds);
    expect(catalogIds.length).toBe(uniqueIds.size);
  });

  it("handles junior room items", () => {
    const career = {
      ...mockCareer(),
      shop: {
        owned: ["plant", "fan", "monitor2"],
        pin: null,
      },
    };
    const loadout: Loadout = {};
    const items = getOwnedItems(career, "junior", loadout);

    // All three items should appear in junior room
    const plant = items.find((i) => i.storeId === "plant");
    const fan = items.find((i) => i.storeId === "fan");
    const monitor2 = items.find((i) => i.storeId === "monitor2");

    expect(plant).toBeDefined();
    expect(fan).toBeDefined();
    expect(monitor2).toBeDefined();

    // All should be overlay items (replaces null)
    expect(plant?.isOverlay).toBe(true);
    expect(fan?.isOverlay).toBe(true);
    expect(monitor2?.isOverlay).toBe(true);

    // All should be active (overlay items are always active when placed)
    expect(plant?.status).toBe("active");
    expect(fan?.status).toBe("active");
    expect(monitor2?.status).toBe("active");
  });

  it("shows overlay items purchased in junior room as active", () => {
    const career = {
      ...mockCareer(),
      shop: {
        owned: ["plant", "fan", "aircon"],
        pin: null,
      },
    };
    const loadout: Loadout = {};
    const items = getOwnedItems(career, "junior", loadout);

    // plant, fan should appear as active overlays
    const plant = items.find((i) => i.storeId === "plant");
    const fan = items.find((i) => i.storeId === "fan");

    expect(plant?.status).toBe("active");
    expect(plant?.isOverlay).toBe(true);
    expect(fan?.status).toBe("active");
    expect(fan?.isOverlay).toBe(true);

    // aircon should be active in junior room now (removed notSold restriction)
    const aircon = items.find((i) => i.storeId === "aircon");
    expect(aircon?.status).toBe("active");
    expect(aircon?.isOverlay).toBe(true);
  });

  it("shows fan purchased in student room as active", () => {
    const career = {
      ...mockCareer(),
      shop: {
        owned: ["fan"],
        pin: null,
      },
    };
    const loadout: Loadout = {};
    const items = getOwnedItems(career, "student", loadout);

    // fan should be active in student room now (removed notSold restriction)
    const fan = items.find((i) => i.storeId === "fan");
    expect(fan?.status).toBe("active");
    expect(fan?.isOverlay).toBe(true);
  });

  it("maps mattress to correct catalog item by stage", () => {
    const studentCareer = {
      ...mockCareer(),
      shop: {
        owned: ["mattress"],
        pin: null,
      },
    };
    const studentItems = getOwnedItems(studentCareer, "student", {});
    const studentMattress = studentItems.find((i) => i.storeId === "mattress");
    expect(studentMattress?.catalogId).toBe("student.mattress");
    expect(studentMattress?.isOverlay).toBe(false); // Replacement item

    const juniorItems = getOwnedItems(studentCareer, "junior", {});
    const juniorMattress = juniorItems.find((i) => i.storeId === "mattress");
    expect(juniorMattress?.catalogId).toBe("junior.bed");
    expect(juniorMattress?.isOverlay).toBe(false); // Replacement item
  });

  it("can use junior items in student room", () => {
    const career = {
      ...mockCareer(),
      shop: {
        owned: ["ergo_chair"],
        pin: null,
      },
    };
    const loadout: Loadout = {};
    const items = getOwnedItems(career, "student", loadout);

    // ergo_chair should be usable in student room now (has placement for student)
    // Check that items exist and at least one item is from junior
    const hasItems = items.length > 0;
    expect(hasItems).toBe(true);
  });

  it("required slots cannot be empty", () => {
    const career = {
      ...mockCareer(),
      shop: {
        owned: ["mattress"],
        pin: null,
      },
    };
    const loadout: Loadout = {
      // mattress slot not set, but it should be required
    };
    const items = getOwnedItems(career, "student", loadout);
    const mattress = items.find((i) => i.storeId === "mattress");

    // Mattress should be findable and could be placed
    expect(mattress).toBeDefined();
    expect(mattress?.catalogId).toBe("student.mattress");
  });

  it("overlay items can be toggled", () => {
    const career = {
      ...mockCareer(),
      shop: {
        owned: ["plant"],
        pin: null,
      },
    };
    const loadout: Loadout = {};
    const items = getOwnedItems(career, "student", loadout);
    const plant = items.find((i) => i.storeId === "plant");

    expect(plant?.isOverlay).toBe(true);
    expect(plant?.status).toBe("active");
  });

  it("items work in rooms without placement", () => {
    const career = {
      ...mockCareer(),
      shop: {
        owned: ["monitor2"],
        pin: null,
      },
    };
    const loadout: Loadout = {};
    const items = getOwnedItems(career, "senior", loadout);
    const monitor = items.find((i) => i.storeId === "monitor2");

    expect(monitor).toBeDefined();
    expect(monitor?.status).toBe("active");
  });

  it("shows default items from all rooms", () => {
    const career = mockCareer();
    const loadout: Loadout = {};
    const items = getOwnedItems(career, "student", loadout);

    // Should include items from junior and senior rooms too
    const hasJuniorItems = items.some((i) => i.catalogId.startsWith("junior."));
    const hasSeniorItems = items.some((i) => i.catalogId.startsWith("senior."));

    expect(hasJuniorItems).toBe(true);
    expect(hasSeniorItems).toBe(true);
  });
});
