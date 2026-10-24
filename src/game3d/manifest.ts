import studentManifestJson from "./manifest/student.json";

/** One placed GLB in the merged student manifest. */
export type ManifestItem = {
  key: string;
  category: "room_shell" | "furniture" | "decor" | "character" | string;
  /** glTF +Y-up position in metres, room centre origin. */
  position: number[];
  /** Rotation around Y in radians (manifests bake all other axes to 0). */
  rotationY: number;
  /** GLB not shipped in public/models yet — renderer skips these. */
  missing?: true;
  note?: string;
};

export type StudentManifest = {
  version: string;
  character_scale: number;
  items: ManifestItem[];
  stage0: { items: ManifestItem[]; hide: string[] };
  poses: Record<"sit" | "stand" | "floor", ManifestItem>;
};

export const STUDENT_MANIFEST = studentManifestJson as unknown as StudentManifest;

export const ITEM_BY_KEY: ReadonlyMap<string, ManifestItem> = new Map(
  STUDENT_MANIFEST.items.map((item) => [item.key, item]),
);
