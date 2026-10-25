import { useGLTF } from "@react-three/drei";
import { STUDENT_MANIFEST, type ManifestItem } from "./manifest";

/**
 * GLB resolution for the 3D student room. Items live under
 * public/models/items/<key>.glb; character pose keys map to their own file
 * names (manifest key "player" is the player_sit.glb export, etc.).
 */
const CHARACTER_FILES: Record<string, string> = {
  player: "player_sit",
  player_standing: "player_stand",
  player_floor: "player_floor",
};

export function itemUrl(key: string): string {
  return `/models/items/${key}.glb`;
}

export function characterUrl(poseKey: string): string {
  return `/models/characters/${CHARACTER_FILES[poseKey] ?? poseKey}.glb`;
}

/**
 * Store purchase id → 3D item key. Every purchasable furniture item maps to
 * its own GLB (ids match the model file names); table_folding stays out of
 * the store because the floor pose renders it for free.
 */
export const STORE_TO_KEY: Record<string, string> = {
  aircon: "aircon",
  ergo_chair: "ergo_chair",
  monitor2: "monitor2",
  mattress: "mattress",
  plant_big: "plant_big",
  fan_standing: "fan_standing",
  plant_small: "plant_small",
  bed_vip: "bed_vip",
  bed_floor_mat: "bed_floor_mat",
  fairy_lights: "fairy_lights",
  lamp_desk: "lamp_desk",
  poster_vn: "poster_vn",
  books_stack: "books_stack",
  kettle: "kettle",
  mug: "mug",
  nightstand: "nightstand",
  stool_plastic: "stool_plastic",
  keyboard: "keyboard",
  // room_junior / room_senior: MVP renders the student room only.
};

/**
 * Item keys that render only through the loadout (a slot entry or its room
 * default resolving to them). Everything else in STUDENT_MANIFEST.items is
 * base furniture, always visible. Ownership alone no longer draws anything.
 */
const LOADOUT_ONLY_KEYS = new Set(Object.keys(STORE_TO_KEY));

export function isLoadoutOnly(key: string): boolean {
  return LOADOUT_ONLY_KEYS.has(key);
}

/** Item keys whose GLB is not shipped yet (flagged by scripts/3d/merge-manifest.ts). */
export const MISSING_KEYS: ReadonlySet<string> = new Set(
  STUDENT_MANIFEST.items.filter((item) => item.missing).map((item) => item.key),
);

function preloadAll(): void {
  for (const item of STUDENT_MANIFEST.items) {
    if (item.missing) continue;
    useGLTF.preload(itemUrl(item.key));
  }
  for (const item of STUDENT_MANIFEST.stage0.items) {
    if (item.missing) continue;
    useGLTF.preload(itemUrl(item.key));
  }
  for (const pose of Object.values(STUDENT_MANIFEST.poses)) {
    if (pose.missing) continue;
    useGLTF.preload(characterUrl(pose.key));
  }
}
preloadAll();

export type { ManifestItem };
