import { useGLTF } from "@react-three/drei";
import { MANIFESTS, type ManifestItem } from "./manifest";

/**
 * GLB resolution for the 3D rooms. Items live under public/models/items/<key>.glb;
 * manifest items may carry their own `url` (the junior/senior room shells ship
 * as one merged /models/room/<stage>/room_shell.glb). Character pose keys map
 * to their own file names (manifest key "player" is the player_sit.glb export).
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

/** Resolve a manifest item to its GLB URL (custom `url` wins over the items dir). */
export function manifestItemUrl(item: ManifestItem): string {
  return item.url ?? itemUrl(item.key);
}

/**
 * Store purchase id → 3D item key. Every purchasable furniture item maps to
 * its own GLB (ids match the model file names); table_folding stays out of
 * the store because the floor pose renders it for free. Room purchases
 * (room_junior / room_senior) are not furniture — they switch the whole shell.
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
};

/**
 * Item keys that render only through the loadout (a slot entry or its room
 * default resolving to them). Everything else in a room manifest is base
 * furniture, always visible. Ownership alone no longer draws anything.
 */
const LOADOUT_ONLY_KEYS = new Set(Object.keys(STORE_TO_KEY));

export function isLoadoutOnly(key: string): boolean {
  return LOADOUT_ONLY_KEYS.has(key);
}

/** Item keys whose GLB is not shipped yet (flagged by scripts/3d/merge-manifest.ts). */
export const MISSING_KEYS: ReadonlySet<string> = new Set(
  MANIFESTS.student.items.filter((item) => item.missing).map((item) => item.key),
);

function preloadAll(): void {
  const urls = new Set<string>();
  for (const manifest of Object.values(MANIFESTS)) {
    for (const item of manifest.items) {
      if (!item.missing) urls.add(manifestItemUrl(item));
    }
    for (const item of manifest.stage0.items) {
      if (!item.missing) urls.add(manifestItemUrl(item));
    }
    for (const pose of Object.values(manifest.poses)) {
      if (!pose.missing) urls.add(characterUrl(pose.key));
    }
  }
  for (const url of urls) useGLTF.preload(url);
}
preloadAll();

export type { ManifestItem };
