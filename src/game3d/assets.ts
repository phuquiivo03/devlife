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

/** Store purchase id → 3D item key. */
export const STORE_TO_KEY: Record<string, string> = {
  plant: "plant_big",
  fan: "fan_standing",
  monitor2: "monitor2",
  mattress: "mattress",
  aircon: "aircon",
  ergo_chair: "ergo_chair",
  // room_junior / room_senior: MVP renders the student room only.
};

/**
 * Manifest items gated behind store ownership. Everything else in
 * STUDENT_MANIFEST.items is base furniture, always visible.
 */
const OWNED_ONLY_KEYS = new Set([
  "plant_big",
  "fan_standing",
  "monitor2",
  "mattress",
  "aircon",
  "ergo_chair",
]);

export function isOwnedOnly(key: string): boolean {
  return OWNED_ONLY_KEYS.has(key);
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
