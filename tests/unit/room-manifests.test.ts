import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
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

  it("ships all three poses and a pick-only stage0 for junior/senior", () => {
    for (const stage of STAGES) {
      const poses = MANIFESTS[stage].poses;
      for (const pose of ["sit", "stand", "floor"] as const) {
        expect(poses[pose], `${stage}:${pose}`).toBeTruthy();
      }
    }
    // Junior/senior have no fresh-room scene: their stage0 holds the items
    // that render only as explicit slot picks (never always-on base furniture).
    for (const stage of ["junior", "senior"] as const) {
      expect(MANIFESTS[stage].stage0.items.map((item) => item.key)).toEqual([
        "table_folding",
        "laptop",
        "cup",
      ]);
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

  it("places junior/senior defaults exactly where the art manifest puts them", () => {
    const artPath = join(process.cwd(), "art", "3d", "room_defaults_v1", "manifest.json");
    const art = JSON.parse(readFileSync(artPath, "utf8")) as {
      rooms: Record<
        "junior" | "senior",
        Array<{ key: string; slot: string; position_gltf_yup: number[]; rotation_y_deg: number }>
      >;
    };
    for (const stage of ["junior", "senior"] as const) {
      for (const entry of art.rooms[stage]) {
        const slot = getRoom(stage).slots.find((s) => s.id === entry.slot);
        expect(slot?.default, `${stage} slot ${entry.slot} default`).toBe(entry.key);
        const item = MANIFESTS[stage].items.find((i) => i.key === CATALOG_TO_GLB[entry.key]);
        expect(item, `${stage} default ${entry.key} has no manifest item`).toBeTruthy();
        expect(item?.position).toEqual(entry.position_gltf_yup);
        const deg = ((item?.rotationY ?? 0) * 180) / Math.PI;
        expect(Math.abs(deg - entry.rotation_y_deg), `${stage}:${entry.key} rotation`).toBeLessThan(
          0.01,
        );
      }
    }
  });

  it("leaves no stand-in mappings — every junior/senior default has its own GLB", () => {
    // The old stand-ins: mug for the mouse, ergo_chair for office/armchair,
    // nightstand for shelf/wardrobe/sideboard, kettle for espresso/grinder,
    // poster_vn for posters/frames, bed_floor_mat for the rug.
    const standIns = new Set([
      "nightstand",
      "kettle",
      "poster_vn",
      "bed_floor_mat",
      "monitor2",
      "keyboard",
      "laptop",
      "mug",
      "desk",
      "ergo_chair",
    ]);
    for (const [catalogId, glb] of Object.entries(CATALOG_TO_GLB)) {
      if (!catalogId.startsWith("junior.") && !catalogId.startsWith("senior.")) continue;
      if (catalogId === "junior.bed" || catalogId === "junior.desk" || catalogId === "junior.monitor") {
        continue; // art reuses the shipped student models verbatim
      }
      if (catalogId === "junior.mug" || catalogId.startsWith("senior.plant_small") || catalogId === "junior.plant_small" || catalogId === "senior.ergo_chair") {
        continue; // reused shipped models per the art manifest
      }
      expect(standIns.has(glb), `${catalogId} still maps to stand-in ${glb}`).toBe(false);
    }
    expect(CATALOG_TO_GLB["junior.mouse"]).toBe("junior_mouse");
    expect(CATALOG_TO_GLB["junior.office_chair"]).toBe("junior_office_chair");
    expect(CATALOG_TO_GLB["senior.armchair"]).toBe("senior_armchair");
    expect(CATALOG_TO_GLB["senior.rug"]).toBe("senior_rug");
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
    // Core default look of the junior apartment — every default now draws its
    // own GLB, no stand-ins.
    expect(plan.drawn.has("bed")).toBe(true);
    expect(plan.drawn.has("desk")).toBe(true);
    expect(plan.drawn.has("monitor")).toBe(true);
    expect(plan.drawn.has("junior_keyboard_mat")).toBe(true);
    expect(plan.drawn.has("junior_mouse")).toBe(true);
    expect(plan.drawn.has("junior_laptop_stand")).toBe(true);
    expect(plan.drawn.has("junior_office_chair")).toBe(true);
    expect(plan.drawn.has("junior_bookshelf")).toBe(true);
    expect(plan.drawn.has("junior_wardrobe")).toBe(true);
    expect(plan.drawn.has("junior_poster_1")).toBe(true);
    expect(plan.drawn.has("junior_poster_2")).toBe(true);
    expect(plan.drawn.has("drawer_pedestal")).toBe(true);
    expect(plan.hidden.has("chair_plastic")).toBe(true); // seat base yields to office_chair
    // Senior: bedless by default, real models for the whole apartment.
    const senior = resolveRoomFurniture(getRoom("senior").slots, {}, new Set(), "senior");
    expect(senior.hidden.has("bed")).toBe(true);
    expect(senior.drawn.has("senior_standing_desk")).toBe(true);
    expect(senior.drawn.has("senior_dual_monitor")).toBe(true);
    expect(senior.drawn.has("senior_keyboard_mat")).toBe(true);
    expect(senior.drawn.has("senior_smart_speaker")).toBe(true);
    expect(senior.drawn.has("senior_sideboard")).toBe(true);
    expect(senior.drawn.has("senior_espresso_machine")).toBe(true);
    expect(senior.drawn.has("senior_coffee_grinder")).toBe(true);
    expect(senior.drawn.has("senior_bookshelf")).toBe(true);
    expect(senior.drawn.has("senior_monstera")).toBe(true);
    expect(senior.drawn.has("senior_armchair")).toBe(true);
    expect(senior.drawn.has("senior_rug")).toBe(true);
    expect(senior.drawn.has("senior_frame_1")).toBe(true);
    expect(senior.drawn.has("senior_frame_2")).toBe(true);
    expect(senior.drawn.has("ergo_chair")).toBe(true);
    expect(senior.drawn.has("drawer_pedestal")).toBe(true);
  });

  it("keeps student defaults out of the drawn set (manifest stays the baseline)", () => {
    const plan = resolveRoomFurniture(getRoom("student").slots, {}, new Set(), "student");
    expect(plan.drawn.size).toBe(0);
  });

  it("places bed picks in the junior/senior bed zones", () => {
    // Senior ships bedless; the floor mat drawn as a bed pick sits in front of
    // the bed zone from its own manifest spot — no position override anymore.
    const senior = resolveRoomFurniture(
      getRoom("senior").slots,
      { bed: "store:bed_floor_mat" },
      new Set(["bed_floor_mat"]),
      "senior",
    );
    expect(senior.drawn.has("bed_floor_mat")).toBe(true);
    expect(senior.positionOverrides.bed_floor_mat).toBeUndefined();
    const matItem = MANIFESTS.senior.items.find((item) => item.key === "bed_floor_mat");
    expect(matItem?.position).toEqual([-0.465, 0.01, 0.25]);

    // A floor-mattress pick replaces the junior bed at its left-wall spot.
    const junior = resolveRoomFurniture(
      getRoom("junior").slots,
      { bed: "student.mattress" },
      new Set(),
      "junior",
    );
    expect(junior.hidden.has("bed")).toBe(true);
    expect(junior.drawn.has("mattress")).toBe(true);
    expect(junior.positionOverrides.mattress).toEqual([-1.45, 0.02, 1.05]);
  });
});
