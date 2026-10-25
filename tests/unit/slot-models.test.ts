import { describe, expect, it } from "vitest";
import {
  resolveRoomFurniture,
  SLOT_BASE_MODEL,
  STORE_SLOT_PREFIX,
} from "@/game3d/slot-models";

const OWNED = (ids: string[]) => new Set(ids);

const SLOTS = [
  { id: "bed", accepts: ["bed"], default: "student.mattress" },
  { id: "desk", accepts: ["desk"], default: "student.folding_table" },
  { id: "seat", accepts: ["chair"], default: null },
  { id: "display", accepts: ["display"], default: "student.laptop" },
  { id: "keyboard", accepts: ["keyboard"], default: null },
  { id: "shelf", accepts: ["shelf"], default: "junior.bookshelf" },
];

describe("resolveRoomFurniture", () => {
  it("keeps the shipped scene when the loadout is untouched", () => {
    const plan = resolveRoomFurniture(SLOTS, {}, OWNED([]));
    expect(plan.visible[SLOT_BASE_MODEL.bed]).toBe(true);
    expect(plan.visible[SLOT_BASE_MODEL.seat]).toBe(true);
    expect(plan.visible[SLOT_BASE_MODEL.display]).toBe(true);
    // Owned-gated base stays hidden until bought.
    expect(plan.visible[SLOT_BASE_MODEL.keyboard]).toBe(false);
  });

  it("auto-replaces owned items on untouched slots", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      {},
      OWNED(["ergo_chair", "bed_vip", "mattress", "monitor2"]),
    );
    expect(plan.visible.chair_plastic).toBe(false);
    expect(plan.visible.ergo_chair).toBe(true);
    expect(plan.visible.bed).toBe(false);
    expect(plan.visible.bed_vip).toBe(true);
    // Overlays draw on top of the base.
    expect(plan.visible.bed).toBe(false);
    expect(plan.visible.mattress).toBe(true);
    expect(plan.visible.monitor).toBe(true);
    expect(plan.visible.monitor2).toBe(true);
  });

  it("empties a slot on an explicit null entry", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { seat: null, bed: null },
      OWNED(["ergo_chair", "bed_vip"]),
    );
    expect(plan.visible.chair_plastic).toBe(false);
    expect(plan.visible.ergo_chair).toBe(false);
    expect(plan.visible.bed).toBe(false);
    expect(plan.visible.bed_vip).toBe(false);
  });

  it("replaces the slot base with a catalog pick", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { desk: "student.folding_table" },
      OWNED([]),
    );
    expect(plan.visible.desk).toBe(false);
    expect(plan.visible.table_folding).toBe(true);
  });

  it("maps store picks through the store: prefix with an ownership guard", () => {
    const placed = resolveRoomFurniture(
      SLOTS,
      { seat: `${STORE_SLOT_PREFIX}stool_plastic` },
      OWNED(["stool_plastic"]),
    );
    expect(placed.visible.chair_plastic).toBe(false);
    expect(placed.visible.stool_plastic).toBe(true);

    // Unowned pick: the slot keeps the untouched look.
    const unowned = resolveRoomFurniture(
      SLOTS,
      { seat: `${STORE_SLOT_PREFIX}stool_plastic` },
      OWNED([]),
    );
    expect(unowned.visible.chair_plastic).toBe(true);
    expect(unowned.visible.stool_plastic).toBeUndefined();
  });

  it("keeps overlays on top of the base when placed", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { bed: `${STORE_SLOT_PREFIX}mattress` },
      OWNED(["mattress"]),
    );
    expect(plan.visible.bed).toBe(true);
    expect(plan.visible.mattress).toBe(true);
  });

  it("keeps the untouched look for catalog entries without a GLB", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { display: "senior.dual_monitor" },
      OWNED([]),
    );
    expect(plan.visible.monitor).toBe(true);
    expect(plan.visible.dual_monitor).toBeUndefined();
  });

  it("moves the floor mattress to floor level when it replaces the bed", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { bed: "student.mattress" },
      OWNED([]),
    );
    expect(plan.visible.bed).toBe(false);
    expect(plan.visible.mattress).toBe(true);
    expect(plan.positionOverrides.mattress).toEqual([-0.315, 0.02, -1.445]);
  });

  it("places the laptop on whichever desk is actually drawn", () => {
    // Desk untouched → the wooden desk draws; the laptop takes the monitor's
    // place on its surface.
    const onDesk = resolveRoomFurniture(
      SLOTS,
      { display: "student.laptop" },
      OWNED([]),
    );
    expect(onDesk.visible.monitor).toBe(false);
    expect(onDesk.visible.laptop).toBe(true);
    expect(onDesk.positionOverrides.laptop).toEqual([-1.76, 0.74, -0.12]);

    // Folding table picked for the desk → the laptop sits on that table.
    const onFolding = resolveRoomFurniture(
      SLOTS,
      { display: "student.laptop", desk: "student.folding_table" },
      OWNED([]),
    );
    expect(onFolding.visible.desk).toBe(false);
    expect(onFolding.visible.table_folding).toBe(true);
    expect(onFolding.visible.laptop).toBe(true);
    expect(onFolding.positionOverrides.laptop).toEqual([-1.535, 0.32, -0.1]);
  });

  it("hides slot-bound store items when the store pick replaces them", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { bed: `${STORE_SLOT_PREFIX}bed_floor_mat` },
      OWNED(["bed_vip", "bed_floor_mat", "mattress"]),
    );
    expect(plan.visible.bed).toBe(false);
    expect(plan.visible.bed_vip).toBe(false);
    expect(plan.visible.mattress).toBe(false);
    expect(plan.visible.bed_floor_mat).toBe(true);
  });
});
