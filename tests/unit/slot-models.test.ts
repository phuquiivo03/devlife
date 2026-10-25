import { describe, expect, it } from "vitest";
import { getRoom } from "@/game/content";
import {
  resolveRoomFurniture,
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
    // Untouched slots fall through to the default rule — nothing drawn or
    // hidden explicitly.
    expect(plan.hidden.has("bed")).toBe(false);
    expect(plan.hidden.has("chair_plastic")).toBe(false);
    expect(plan.drawn.has("keyboard")).toBe(false);
    expect(plan.hidden.has("keyboard")).toBe(false);
  });

  it("auto-replaces owned items on untouched slots", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      {},
      OWNED(["ergo_chair", "bed_vip", "mattress", "monitor2"]),
    );
    expect(plan.hidden.has("chair_plastic")).toBe(true);
    expect(plan.drawn.has("ergo_chair")).toBe(true);
    expect(plan.hidden.has("bed")).toBe(true);
    expect(plan.drawn.has("bed_vip")).toBe(true);
    // Overlays and free-standing picks draw through the owned default rule.
    expect(plan.hidden.has("mattress")).toBe(false);
    expect(plan.hidden.has("monitor2")).toBe(false);
    expect(plan.drawn.has("mattress")).toBe(false);
    expect(plan.drawn.has("monitor2")).toBe(false);
  });

  it("empties a slot on an explicit null entry", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { seat: null, bed: null },
      OWNED(["ergo_chair", "bed_vip"]),
    );
    expect(plan.hidden.has("chair_plastic")).toBe(true);
    expect(plan.hidden.has("ergo_chair")).toBe(true);
    expect(plan.hidden.has("bed")).toBe(true);
    expect(plan.hidden.has("bed_vip")).toBe(true);
  });

  it("replaces the slot base with a catalog pick", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { desk: "student.folding_table" },
      OWNED([]),
    );
    expect(plan.hidden.has("desk")).toBe(true);
    expect(plan.drawn.has("table_folding")).toBe(true);
  });

  it("maps store picks through the store: prefix with an ownership guard", () => {
    const placed = resolveRoomFurniture(
      SLOTS,
      { seat: `${STORE_SLOT_PREFIX}stool_plastic` },
      OWNED(["stool_plastic"]),
    );
    expect(placed.hidden.has("chair_plastic")).toBe(true);
    expect(placed.drawn.has("stool_plastic")).toBe(true);

    // Unowned pick: the slot keeps the untouched look.
    const unowned = resolveRoomFurniture(
      SLOTS,
      { seat: `${STORE_SLOT_PREFIX}stool_plastic` },
      OWNED([]),
    );
    expect(unowned.drawn.has("stool_plastic")).toBe(false);
    expect(unowned.hidden.has("chair_plastic")).toBe(false);
  });

  it("keeps overlays on top of the base when placed", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { bed: `${STORE_SLOT_PREFIX}mattress` },
      OWNED(["mattress"]),
    );
    expect(plan.hidden.has("bed")).toBe(false);
    expect(plan.drawn.has("mattress")).toBe(true);
  });

  it("keeps the untouched look for catalog entries without a GLB", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { display: "senior.dual_monitor" },
      OWNED([]),
    );
    expect(plan.hidden.has("monitor")).toBe(false);
    expect(plan.drawn.has("dual_monitor")).toBe(false);
  });

  it("moves the floor mattress to floor level when it replaces the bed", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { bed: "student.mattress" },
      OWNED([]),
    );
    expect(plan.hidden.has("bed")).toBe(true);
    expect(plan.drawn.has("mattress")).toBe(true);
    expect(plan.positionOverrides.mattress).toEqual([-0.315, 0.02, -1.445]);
  });

  it("hides the same-spot bed family when the floor mat replaces the bed", () => {
    const plan = resolveRoomFurniture(
      SLOTS,
      { bed: `${STORE_SLOT_PREFIX}bed_floor_mat` },
      OWNED(["bed_vip", "bed_floor_mat", "mattress"]),
    );
    expect(plan.hidden.has("bed")).toBe(true);
    expect(plan.hidden.has("bed_vip")).toBe(true);
    expect(plan.hidden.has("mattress")).toBe(true);
    expect(plan.drawn.has("bed_floor_mat")).toBe(true);
  });

  it("draws owned fan_standing / books_stack picks in the real student room", () => {
    const slots = getRoom("student").slots;
    const plan = resolveRoomFurniture(
      slots,
      {
        decor_1: `${STORE_SLOT_PREFIX}fan_standing`,
        decor_3: `${STORE_SLOT_PREFIX}books_stack`,
      },
      OWNED(["fan_standing", "books_stack"]),
    );
    // The two floor_decor slots coexist — neither pick hides the other.
    expect(plan.drawn.has("fan_standing")).toBe(true);
    expect(plan.drawn.has("books_stack")).toBe(true);
    // Untouched on a fresh save they still show once owned (default rule).
    const untouched = resolveRoomFurniture(
      slots,
      {},
      OWNED(["fan_standing", "books_stack"]),
    );
    expect(untouched.drawn.has("fan_standing")).toBe(false);
    expect(untouched.hidden.has("fan_standing")).toBe(false);
    expect(untouched.drawn.has("books_stack")).toBe(false);
    expect(untouched.hidden.has("books_stack")).toBe(false);
  });

  it("places the laptop on whichever desk is actually drawn", () => {
    // Desk untouched → the wooden desk draws; the laptop takes the monitor's
    // place on its surface.
    const onDesk = resolveRoomFurniture(
      SLOTS,
      { display: "student.laptop" },
      OWNED([]),
    );
    expect(onDesk.hidden.has("monitor")).toBe(true);
    expect(onDesk.drawn.has("laptop")).toBe(true);
    expect(onDesk.positionOverrides.laptop).toEqual([-1.76, 0.74, -0.12]);

    // Folding table picked for the desk → the laptop sits on that table.
    const onFolding = resolveRoomFurniture(
      SLOTS,
      { display: "student.laptop", desk: "student.folding_table" },
      OWNED([]),
    );
    expect(onFolding.hidden.has("desk")).toBe(true);
    expect(onFolding.drawn.has("table_folding")).toBe(true);
    expect(onFolding.drawn.has("laptop")).toBe(true);
    expect(onFolding.positionOverrides.laptop).toEqual([-1.535, 0.32, -0.1]);
  });
});
