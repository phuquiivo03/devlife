/**
 * Merge the per-wave student room manifests into one compact manifest for the
 * R3F renderer: src/game3d/manifest/student.json.
 *
 * Sources (all under src/game3d/manifest/):
 * - student_wave1_2.json      base items
 * - student_sit_rot2.json     overrides for chair_plastic, keyboard, player sit/stand
 * - student_stage0_rot3.json  stage0 set (player_floor arms on laptop, table_folding, laptop)
 * - student_wave2.json        MISSING from the repo — wave2 positions are embedded
 *                             below verbatim from the approved task spec.
 *
 * Only `position_gltf_yup` + `rotation_euler_gltf_rad` are kept. Blender Z-up
 * fields and stale `file` paths (pointing at old Blender exports) are dropped;
 * real GLB paths are resolved from public/models and each entry gets
 * `missing: true` when its GLB is not shipped yet.
 *
 * Run: pnpm 3d:manifest
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestDir = join(repoRoot, "src", "game3d", "manifest");
const outPath = join(manifestDir, "student.json");
const modelsDir = join(repoRoot, "public", "models");

type SourceItem = {
  key: string;
  category: string;
  position_gltf_yup: number[];
  rotation_euler_gltf_rad: number[];
};

type SourceManifest = {
  character_scale: number;
  items: SourceItem[];
  stage0?: Array<SourceItem | { hide_in_stage0: string[] }>;
};

function load(name: string): SourceManifest {
  return JSON.parse(readFileSync(join(manifestDir, name), "utf8")) as SourceManifest;
}

type MergedItem = {
  key: string;
  category: string;
  position: number[];
  rotationY: number;
  missing?: true;
  note?: string;
};

const wave1_2 = load("student_wave1_2.json");
const rot2 = load("student_sit_rot2.json");
const rot3 = load("student_stage0_rot3.json");

// student_wave2.json was never committed; positions from the approved spec:
// monitor2 (side monitor), mattress (bed overlay), aircon (wall, right side).
// ergo_chair's wave2 spot was provisional — it renders at the rot2 chair seat
// instead (see ERGO_CHAIR below).
const WAVE2_ITEMS: Array<Omit<MergedItem, "missing">> = [
  {
    key: "monitor2",
    category: "decor",
    position: [-1.74, 0.74, -0.64],
    rotationY: (-78 * Math.PI) / 180,
    note: "secondary screen next to the main monitor; owned only",
  },
  {
    key: "mattress",
    category: "furniture",
    position: [-0.255, 0.28, -1.465],
    rotationY: 0,
    note: "overlay on the bed; owned only",
  },
  {
    key: "aircon",
    category: "decor",
    position: [1.35, 1.55, -1.89],
    rotationY: Math.PI,
    note: "wall mounted, right wall; owned only",
  },
];

function toMerged(src: SourceItem, extra?: Partial<MergedItem>): MergedItem {
  return {
    key: src.key,
    category: src.category === "desk" ? "decor" : src.category,
    position: src.position_gltf_yup,
    rotationY: src.rotation_euler_gltf_rad[1] ?? 0,
    ...extra,
  };
}

const rot2ById = new Map(rot2.items.map((i) => [i.key, i]));
// rot2 only refines the desk set + characters; everything else equals wave1_2.
const ROT2_OVERRIDE_KEYS = new Set(["chair_plastic", "keyboard", "player", "player_standing"]);

const items: MergedItem[] = [];
for (const base of wave1_2.items) {
  if (base.key === "cat") continue; // no cat.glb in public/models
  if (base.key === "player" || base.key === "player_standing") continue; // moved to poses
  const override = ROT2_OVERRIDE_KEYS.has(base.key) ? rot2ById.get(base.key) : undefined;
  items.push(toMerged(override ?? base));
}

// ergo_chair replaces chair_plastic at the rot2 seat transform when owned
// (per spec), not at its provisional wave2 corner spot (0.25, 0.02, 0.75).
const chairSeat = rot2ById.get("chair_plastic")!;
items.push(
  toMerged(chairSeat, {
    key: "ergo_chair",
    note: "replaces chair_plastic at the rot2 seat when owned; wave2 spot was provisional",
  }),
);
items.push(...WAVE2_ITEMS);

// stage0: rot3 player_floor (hands on laptop) + table_folding + laptop.
const stage0Items: MergedItem[] = [];
let stage0Hide: string[] = [];
for (const row of rot3.stage0 ?? []) {
  if ("hide_in_stage0" in row) {
    stage0Hide = row.hide_in_stage0;
    continue;
  }
  if (row.key === "player_floor") continue; // moved to poses
  stage0Items.push(toMerged(row));
}

const poses = {
  sit: toMerged(rot2ById.get("player")!),
  stand: toMerged(rot2ById.get("player_standing")!),
  floor: toMerged(
    (rot3.stage0 ?? []).find(
      (row): row is SourceItem => "key" in row && row.key === "player_floor",
    )!,
  ),
};

// Character GLBs live under characters/<name>.glb and differ from pose keys.
const POSE_FILES: Record<string, string> = {
  player: "player_sit",
  player_standing: "player_stand",
  player_floor: "player_floor",
};

function glbExists(rel: string): boolean {
  return existsSync(join(modelsDir, rel));
}
for (const item of items) {
  if (!glbExists(`items/${item.key}.glb`)) item.missing = true;
}
for (const item of stage0Items) {
  if (!glbExists(`items/${item.key}.glb`)) item.missing = true;
}
for (const pose of Object.values(poses)) {
  if (!glbExists(`characters/${POSE_FILES[pose.key] ?? pose.key}.glb`)) pose.missing = true;
}

const merged = {
  version: "student_merged_1",
  character_scale: wave1_2.character_scale,
  items,
  stage0: { items: stage0Items, hide: stage0Hide },
  poses,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(merged, null, 1)}\n`, "utf8");

const missing = [...items, ...stage0Items, ...Object.values(poses)].filter((i) => i.missing);
console.log(`wrote ${outPath} (${items.length} items, ${stage0Items.length} stage0 items)`);
if (missing.length) {
  console.log(`missing GLBs (renderer will skip): ${missing.map((i) => i.key).join(", ")}`);
}
