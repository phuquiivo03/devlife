import studentManifestJson from "./manifest/student.json";
import juniorManifestJson from "./manifest/junior.json";
import seniorManifestJson from "./manifest/senior.json";
import type { StageId } from "@/game/config";

/** One placed GLB in a room manifest. */
export type ManifestItem = {
  key: string;
  category: "room_shell" | "furniture" | "decor" | "character" | string;
  /** glTF +Y-up position in metres, room centre origin. */
  position: number[];
  /** Rotation around Y in radians (manifests bake all other axes to 0). */
  rotationY: number;
  /**
   * Full public path when the GLB does not live under /models/items — the
   * junior/senior room shells ship as one merged /models/room/<stage>/ GLB.
   */
  url?: string;
  /** GLB not shipped in public/models yet — renderer skips these. */
  missing?: true;
  note?: string;
};

export type RoomManifest = {
  version: string;
  character_scale: number;
  items: ManifestItem[];
  stage0: { items: ManifestItem[]; hide: string[] };
  poses: Record<"sit" | "stand" | "floor", ManifestItem>;
};

/** Pre-loadout alias kept for the student-era imports. */
export type StudentManifest = RoomManifest;

export const MANIFESTS: Record<StageId, RoomManifest> = {
  student: studentManifestJson as unknown as RoomManifest,
  junior: juniorManifestJson as unknown as RoomManifest,
  senior: seniorManifestJson as unknown as RoomManifest,
};

export const STUDENT_MANIFEST = MANIFESTS.student;

export const ITEM_BY_KEY: ReadonlyMap<string, ManifestItem> = new Map(
  STUDENT_MANIFEST.items.map((item) => [item.key, item]),
);

/** Manifest of the room the player is in; unknown stages fall back to student. */
export function getRoomManifest(stage: string): RoomManifest {
  return (MANIFESTS as Record<string, RoomManifest>)[stage] ?? MANIFESTS.student;
}

/** Top-level manifest item (`items` only — stage0/poses excluded) by GLB key. */
export function itemByKey(stage: string, key: string): ManifestItem | undefined {
  return getRoomManifest(stage).items.find((item) => item.key === key);
}
