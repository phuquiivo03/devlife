import { describe, expect, it } from "vitest";
import { getCatalog } from "@/game/content";
import { defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import { STORE_ITEMS } from "@/game/life/furniture";
import { applyItemUse, ITEM_USE } from "@/game/life/item-use";
import { CATALOG_TO_GLB, STORE_SLOT_PREFIX } from "@/game3d/slot-models";
import { STORE_TO_KEY } from "@/game3d/assets";
import { MANIFESTS } from "@/game3d/manifest";
import { STAGES } from "@/game/config";

const ROOM_KEYS = new Set(
  STAGES.flatMap((stage) => [
    ...MANIFESTS[stage].items
      .filter((item) => item.category !== "room_shell" && !item.missing)
      .map((item) => item.key),
    ...MANIFESTS[stage].stage0.items.filter((item) => !item.missing).map((item) => item.key),
  ]),
);

describe("item use", () => {
  it("gives every placed room mesh a use action with a Vietnamese notice and a stat change", () => {
    for (const key of ROOM_KEYS) {
      const action = ITEM_USE[key];
      expect(action, key).toBeTruthy();
      expect(action?.notice.length, key).toBeGreaterThan(0);
      const delta = (action?.mood ?? 0) + (action?.energy ?? 0) + (action?.health ?? 0) + (action?.fullness ?? 0);
      expect(delta, key).not.toBe(0);
      // Same scale as existing furniture bonuses and a snack, not a full day of sleep or a meal.
      expect(Math.abs(action?.mood ?? 0), key).toBeLessThanOrEqual(3);
      expect(Math.abs(action?.energy ?? 0), key).toBeLessThanOrEqual(8);
      expect(Math.abs(action?.health ?? 0), key).toBeLessThanOrEqual(1);
      expect(Math.abs(action?.fullness ?? 0), key).toBeLessThanOrEqual(12);
    }
  });

  it("maps catalog and store items that have a mesh onto that action", () => {
    for (const item of getCatalog().items) {
      const glb = CATALOG_TO_GLB[item.id];
      if (!glb || !ROOM_KEYS.has(glb)) continue;
      expect(ITEM_USE[glb], item.id).toBeTruthy();
    }
    for (const item of STORE_ITEMS) {
      if (item.id === "room_junior" || item.id === "room_senior") continue;
      const glb = STORE_TO_KEY[item.id];
      expect(ITEM_USE[glb], item.id).toBeTruthy();
      expect(STORE_SLOT_PREFIX.length).toBeGreaterThan(0);
    }
  });

  it("changes a stat and returns the notice", () => {
    const state = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const before = state.players.mood;
    const used = applyItemUse(state, "books_stack");
    expect(used.notice).toBe("Đọc vài trang.");
    expect(used.state.players.mood).toBeGreaterThan(before);
    expect(used.events.some((event) => event.type === "moodChanged")).toBe(true);
    expect(applyItemUse(state, "not-an-item").notice).toBe("");
  });
});
