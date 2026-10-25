import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getCatalog, getRoom } from "@/game/content";
import { STAGES } from "@/game/config";
import { STORE_ITEMS } from "@/game/life/furniture";
import {
  getRoomManifest,
  itemByKey,
  ITEM_BY_KEY,
  MANIFESTS,
  STUDENT_MANIFEST,
} from "@/game3d/manifest";
import { STORE_TO_KEY } from "@/game3d/assets";
import { CATALOG_TO_GLB, resolveRoomFurniture, SLOT_BASE_MODEL } from "@/game3d/slot-models";

const publicDir = join(process.cwd(), "public");

/** GLB keys a slot could draw in this room: its default, its base model,
 * every store item and every catalog item accepted by the slot. */
function drawableKeys(stage: "student" | "junior" | "senior", slotId: string): string[] {
  const slot = getRoom(stage).slots.find((s) => s.id === slotId);
  if (!slot) return [];
  const accepts = slot.accepts as readonly string[];
  const keys: (string | undefined)[] = [
    slot.default ? CATALOG_TO_GLB[slot.default] : undefined,
    SLOT_BASE_MODEL[slot.id],
  ];
  for (const item of STORE_ITEMS) {
    if (item.category != null && accepts.includes(item.category)) {
      keys.push(STORE_TO_KEY[item.id]);
    }
  }
  for (const item of getCatalog().items) {
    if (accepts.includes(item.category)) {
      keys.push(CATALOG_TO_GLB[item.id]);
    }
  }
  return keys.filter((key): key is string => key != null);
}

describe("room manifests", () => {
  it("ships a room shell per stage, junior/senior as one merged GLB", () => {
    expect(getRoomManifest("student")).toBe(STUDENT_MANIFEST);
    expect(getRoomManifest("junior")).toBe(MANIFESTS.junior);
    expect(getRoomManifest("senior")).toBe(MANIFESTS.senior);
    expect(getRoomManifest("unknown-stage")).toBe(STUDENT_MANIFEST);

    for (const stage of ["junior", "senior"] as const) {
      const shells = MANIFESTS[stage].items.filter((item) => item.category === "room_shell");
      expect(shells.map((shell) => shell.key)).toEqual(["room_shell"]);
      expect(shells[0]?.url).toBe(`/models/room/${stage}/room_shell.glb`);
      expect(existsSync(join(publicDir, "models", "room", stage, "room_shell.glb"))).toBe(true);
    }
    // The student shell stays the three items-dir meshes.
    const studentShells = STUDENT_MANIFEST.items
      .filter((item) => item.category === "room_shell")
      .map((item) => item.key);
    expect(studentShells).toEqual(["floor_base", "walls", "wall_tiles"]);
  });

  it("points every non-shell item at a GLB that exists on disk", () => {
    const itemsDir = join(publicDir, "models", "items");
    for (const stage of STAGES) {
      for (const item of MANIFESTS[stage].items) {
        if (item.category === "room_shell" || item.missing) continue;
        expect(existsSync(join(itemsDir, `${item.key}.glb`)), `${stage}:${item.key}`).toBe(true);
      }
    }
  });

  it("keeps itemByKey per stage and the student compat map", () => {
    const juniorDesk = itemByKey("junior", "desk");
    expect(juniorDesk?.position).toBe(
      MANIFESTS.junior.items.find((item) => item.key === "desk")?.position,
    );
    expect(itemByKey("senior", "desk")?.position).not.toEqual(juniorDesk?.position);
    expect(ITEM_BY_KEY.get("desk")).toBe(
      STUDENT_MANIFEST.items.find((item) => item.key === "desk"),
    );
  });

  it("ships all three poses and an empty stage0 for junior/senior", () => {
    for (const stage of STAGES) {
      const poses = MANIFESTS[stage].poses;
      for (const pose of ["sit", "stand", "floor"] as const) {
        expect(poses[pose], `${stage}:${pose}`).toBeTruthy();
      }
    }
    for (const stage of ["junior", "senior"] as const) {
      expect(MANIFESTS[stage].stage0.items).toEqual([]);
      expect(MANIFESTS[stage].stage0.hide).toEqual([]);
    }
  });

  it("maps every junior/senior default to a GLB placed in that room's manifest", () => {
    for (const stage of ["junior", "senior"] as const) {
      const manifestKeys = new Set(MANIFESTS[stage].items.map((item) => item.key));
      for (const slot of getRoom(stage).slots) {
        if (!slot.default) continue;
        const glb = CATALOG_TO_GLB[slot.default];
        expect(glb, `${stage} default ${slot.default} has no GLB mapping`).toBeTruthy();
        expect(manifestKeys.has(glb), `${stage}:${glb} missing from manifest`).toBe(true);
      }
    }
  });

  it("gives every shared slot a drawable GLB position in every room", () => {
    for (const stage of STAGES) {
      // Stage0 items (folding table, laptop) also render as slot picks in
      // the student room, so they count as positioned keys there.
      const positioned = new Set([
        ...MANIFESTS[stage].items.map((item) => item.key),
        ...MANIFESTS[stage].stage0.items.map((item) => item.key),
      ]);
      for (const slot of getRoom(stage).slots) {
        const covered = drawableKeys(stage, slot.id).some((key) => positioned.has(key));
        expect(covered, `${stage} slot ${slot.id} has no drawable manifest item`).toBe(true);
      }
    }
  });

  it("draws junior/senior defaults from an untouched loadout", () => {
    const plan = resolveRoomFurniture(getRoom("junior").slots, {}, new Set(), "junior");
    // Core default look of the junior apartment.
    expect(plan.drawn.has("bed")).toBe(true);
    expect(plan.drawn.has("desk")).toBe(true);
    expect(plan.drawn.has("monitor")).toBe(true);
    expect(plan.drawn.has("ergo_chair")).toBe(true);
    expect(plan.hidden.has("chair_plastic")).toBe(true); // seat base yields to office_chair
    // Senior: bedless by default, rug + dual monitor drawn instead.
    const senior = resolveRoomFurniture(getRoom("senior").slots, {}, new Set(), "senior");
    expect(senior.hidden.has("bed")).toBe(true);
    expect(senior.drawn.has("monitor2")).toBe(true);
    expect(senior.drawn.has("bed_floor_mat")).toBe(true); // senior.rug
  });

  it("keeps student defaults out of the drawn set (manifest stays the baseline)", () => {
    const plan = resolveRoomFurniture(getRoom("student").slots, {}, new Set(), "student");
    expect(plan.drawn.size).toBe(0);
  });

  it("repositions the senior floor mat when picked as the bed", () => {
    const senior = resolveRoomFurniture(
      getRoom("senior").slots,
      { bed: "store:bed_floor_mat" },
      new Set(["bed_floor_mat"]),
      "senior",
    );
    expect(senior.drawn.has("bed_floor_mat")).toBe(true);
    expect(senior.positionOverrides.bed_floor_mat).toEqual([-0.15, 0.01, -1.42]);
  });
});
