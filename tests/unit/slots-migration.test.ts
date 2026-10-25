import { describe, expect, it } from "vitest";
import { PERSIST_VERSION } from "@/game/config";
import { migrateSave } from "@/game/storage/migrate";

describe("version 23 shared-slot migration", () => {
  it("bumps the persist version", () => {
    expect(PERSIST_VERSION).toBeGreaterThanOrEqual(23);
  });

  it("auto-places owned items into every stage, aircon and lamp_desk included", () => {
    const migrated = migrateSave(
      {
        stage: "student",
        totalMinutes: 2 * 24 * 60 + 8 * 60,
        showCharacter: true,
        loadouts: { student: {}, junior: {}, senior: {} },
        career: {
          players: { money: 50_000_000 },
          shop: { owned: ["aircon", "lamp_desk", "plant_big", "bed_vip"], pin: null },
        },
      },
      22,
    );

    for (const stage of ["student", "junior", "senior"] as const) {
      const loadout = migrated.loadouts[stage];
      expect(loadout.aircon).toBe("store:aircon");
      expect(loadout.desk_lamp).toBe("store:lamp_desk");
      expect(loadout.decor_1).toBe("store:plant_big");
      expect(loadout.bed).toBe("store:bed_vip");
    }
  });

  it("never overwrites an existing choice, including an explicit null", () => {
    const migrated = migrateSave(
      {
        stage: "student",
        totalMinutes: 2 * 24 * 60 + 8 * 60,
        showCharacter: true,
        loadouts: {
          // bed emptied by the player, decor_1 turned off, desk swapped,
          // mug already placed — none of these may be replaced.
          student: {
            bed: null,
            decor_1: null,
            desk: "student.folding_table",
            cup: "store:mug",
          },
          junior: {},
          senior: {},
        },
        career: {
          players: { money: 50_000_000 },
          shop: {
            owned: ["aircon", "lamp_desk", "plant_big", "bed_vip", "mug"],
            pin: null,
          },
        },
      },
      22,
    );

    const student = migrated.loadouts.student;
    expect(student.bed).toBeNull();
    expect(student.decor_1).toBeNull();
    expect(student.desk).toBe("student.folding_table");
    expect(student.cup).toBe("store:mug");
    // Same-category overflow lands in the next free slot, never on a choice.
    expect(student.decor_2).toBe("store:plant_big");
    // aircon/lamp_desk still land (their slots are new, so always free).
    expect(student.aircon).toBe("store:aircon");
    expect(student.desk_lamp).toBe("store:lamp_desk");

    // Junior was untouched, so bed_vip still finds a bed there.
    expect(migrated.loadouts.junior.bed).toBe("store:bed_vip");
    // A save owning nothing gains no loadout entries.
  });

  it("keeps a save that owns one item per slot visible in every stage", () => {
    // At most one owned item per shared spot (bed/chair/display hold a single
    // pick), so every item here must land in all three stages.
    const owned = [
      "aircon",
      "ergo_chair",
      "monitor2",
      "bed_vip",
      "plant_big",
      "fan_standing",
      "books_stack",
      "plant_small",
      "fairy_lights",
      "lamp_desk",
      "poster_vn",
      "kettle",
      "mug",
      "nightstand",
      "keyboard",
    ];
    const migrated = migrateSave(
      {
        stage: "student",
        totalMinutes: 2 * 24 * 60 + 8 * 60,
        showCharacter: true,
        loadouts: { student: {}, junior: {}, senior: {} },
        career: { players: { money: 1_000_000_000 }, shop: { owned, pin: null } },
      },
      22,
    );
    for (const stage of ["student", "junior", "senior"] as const) {
      const placed = new Set(Object.values(migrated.loadouts[stage]));
      for (const id of owned) {
        expect(placed.has(`store:${id}`), `${stage} ${id}`).toBe(true);
      }
    }
  });

  it("adds nothing when the save owns nothing", () => {
    const migrated = migrateSave(
      {
        stage: "student",
        totalMinutes: 2 * 24 * 60 + 8 * 60,
        showCharacter: true,
        loadouts: { student: {}, junior: {}, senior: {} },
        career: { players: { money: 0 } },
      },
      22,
    );
    expect(migrated.loadouts).toEqual({ student: {}, junior: {}, senior: {} });
  });
});
