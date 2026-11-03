import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getCatalog, getRoom } from "@/game/content";
import { STAGES, type StageId } from "@/game/config";
import { STORE_ITEMS } from "@/game/life/furniture";
import { CATALOG_SHOP_ICONS } from "@/components/game/owned-items";
import { isLoadoutOnly, STORE_TO_KEY } from "@/game3d/assets";
import { manifestMeshVisible } from "@/game3d/furniture-visibility";
import { itemByKey, MANIFESTS } from "@/game3d/manifest";
import { hideChairForPose } from "@/game3d/pose";
import {
  CATALOG_TO_GLB,
  resolveRoomFurniture,
  SEAT_ANCHOR,
  STORE_SLOT_PREFIX,
} from "@/game3d/slot-models";

const SEAT_KEYS = new Set([
  "chair_plastic",
  "ergo_chair",
  "junior_office_chair",
  "stool_plastic",
]);

function positioned(stage: StageId): Set<string> {
  return new Set([
    ...MANIFESTS[stage].items.map((item) => item.key),
    ...MANIFESTS[stage].stage0.items.map((item) => item.key),
  ]);
}

type ShopPick = { id: string; label: string; glb: string; category: string; entry: string; owned: string[] };

function shopPicks(): ShopPick[] {
  const picks: ShopPick[] = [];
  for (const item of STORE_ITEMS) {
    const glb = STORE_TO_KEY[item.id];
    if (!glb || !item.category) continue;
    picks.push({
      id: item.id,
      label: item.label,
      glb,
      category: item.category,
      entry: `${STORE_SLOT_PREFIX}${item.id}`,
      owned: [item.id],
    });
  }
  const catalog = getCatalog();
  for (const catalogId of Object.keys(CATALOG_SHOP_ICONS)) {
    const glb = CATALOG_TO_GLB[catalogId];
    const item = catalog.itemsById.get(catalogId);
    if (!glb || !item) continue;
    picks.push({
      id: catalogId,
      label: item.name.vi,
      glb,
      category: item.category,
      entry: catalogId,
      owned: [],
    });
  }
  return picks;
}

describe("shop meshes in every room", () => {
  const picks = shopPicks();

  it("lists the shop catalog the owner can equip", () => {
    const ids = picks.map((pick) => pick.id);
    expect(ids).toContain("junior.desk");
    expect(ids).toContain("junior.office_chair");
    expect(ids.length).toBeGreaterThan(20);
  });

  it("draws every shop item's GLB when it is equipped", () => {
    const missing: string[] = [];
    for (const stage of STAGES) {
      const keys = positioned(stage);
      const slots = getRoom(stage).slots;
      for (const pick of picks) {
        const slot = slots.find((candidate) =>
          (candidate.accepts as readonly string[]).includes(pick.category),
        );
        if (!slot) {
          missing.push(`${stage} ${pick.id} (${pick.category}) has no slot`);
          continue;
        }
        const glbFile = join(process.cwd(), "public/models/items", `${pick.glb}.glb`);
        if (!existsSync(glbFile)) missing.push(`${pick.glb}.glb file missing`);
        if (!keys.has(pick.glb)) missing.push(`${stage} manifest has no ${pick.glb} for ${pick.id}`);
        const plan = resolveRoomFurniture(
          slots,
          { [slot.id]: pick.entry },
          new Set(pick.owned),
          stage,
        );
        if (!plan.drawn.has(pick.glb)) {
          missing.push(`${stage} equip ${pick.id} did not draw ${pick.glb}`);
          continue;
        }
        const stage0 = stage === "student" && !pick.owned.includes("monitor2") && !pick.owned.includes("ergo_chair");
        const pose = SEAT_KEYS.has(pick.glb) ? "sit" : "floor";
        const shown = manifestMeshVisible({
          key: pick.glb,
          drawn: plan.drawn,
          hiddenBySlot: plan.hidden,
          stage0Hide: new Set(stage0 ? MANIFESTS.student.stage0.hide : []),
          loadoutOnly: isLoadoutOnly(pick.glb),
          pose,
        });
        if (!shown) missing.push(`${stage} ${pick.id} draws ${pick.glb} but the mesh stays hidden`);
        if (slot.id === "seat") {
          expect(plan.positionOverrides[pick.glb], `${stage} ${pick.id}`).toEqual(SEAT_ANCHOR[stage]);
        }
        const inManifest =
          itemByKey(stage, pick.glb) != null ||
          MANIFESTS[stage].stage0.items.some((item) => item.key === pick.glb);
        if (!inManifest) missing.push(`${stage} ${pick.glb} is not a placed manifest item`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("keeps an equipped office chair visible while sitting and hidden on the floor", () => {
    for (const stage of STAGES) {
      const plan = resolveRoomFurniture(
        getRoom(stage).slots,
        { seat: "junior.office_chair" },
        new Set(),
        stage,
      );
      expect(plan.drawn.has("junior_office_chair")).toBe(true);
      expect(hideChairForPose("sit", "junior_office_chair")).toBe(false);
      expect(hideChairForPose("floor", "junior_office_chair")).toBe(true);
      expect(itemByKey(stage, "junior_office_chair")).toBeTruthy();
    }
  });

  it("shows Bàn gỗ in the student room instead of the folding table", () => {
    const plan = resolveRoomFurniture(
      getRoom("student").slots,
      { desk: "junior.desk" },
      new Set(),
      "student",
    );
    expect(plan.drawn.has("desk")).toBe(true);
    const stage0Hide = new Set(MANIFESTS.student.stage0.hide);
    expect(
      manifestMeshVisible({
        key: "desk",
        drawn: plan.drawn,
        hiddenBySlot: plan.hidden,
        stage0Hide,
        loadoutOnly: isLoadoutOnly("desk"),
        pose: "floor",
      }),
    ).toBe(true);
  });
});
