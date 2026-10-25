import placementFile from "./placement.json";
import type { StageId } from "../config";
import type { DrawEntry } from "../types";

type PlacementRow = {
  item: string;
  room: StageId;
  anchor: { x: number; y: number };
  size: { w: number; h: number };
  facing: string;
  replaces: string | null;
  kind: "floor" | "wall" | "surface";
  sprite?: string;
};

const PLACEMENT = placementFile as {
  items: PlacementRow[];
  notSold: { item: string; room: string }[];
};

const LAYER_WALL = 1;
const LAYER_SHADOW = 3;
const LAYER_OBJECT = 4;

type Shadow = { file: string; w: number; h: number };

const SHADOW: Record<string, Shadow | undefined> = {
  plant_big: { file: "item_plant_shadow.png", w: 30, h: 8 },
  fan_standing: { file: "item_fan_shadow.png", w: 44, h: 10 },
  ergo_chair: { file: "item_ergo_chair_shadow.png", w: 59, h: 14 },
};

const MATTRESS_SHADOW: Record<string, Shadow> = {
  item_mattress_student: { file: "item_mattress_student_shadow.png", w: 121, h: 20 },
  item_mattress_junior: { file: "item_mattress_junior_shadow.png", w: 102, h: 26 },
};

export function placementRows(): readonly PlacementRow[] {
  return PLACEMENT.items;
}

export function notSold(item: string, room: string): boolean {
  return PLACEMENT.notSold.some((row) => row.item === item && row.room === room);
}

export function replacedItemIds(stage: StageId, owned: readonly string[]): Set<string> {
  const have = new Set(owned);
  const ids = new Set<string>();
  for (const row of PLACEMENT.items) {
    if (row.room !== stage || !row.replaces || !have.has(row.item)) continue;
    ids.add(row.replaces);
  }
  return ids;
}

function spriteFile(row: PlacementRow): string {
  if (row.sprite) return `${row.sprite}.png`;
  return `item_${row.item}.png`;
}

function shadowFor(row: PlacementRow): Shadow | null {
  if (row.kind !== "floor") return null;
  if (row.item === "mattress" && row.sprite) return MATTRESS_SHADOW[row.sprite] ?? null;
  return SHADOW[row.item] ?? null;
}

/**
 * Bottom-center anchor in native room pixels.
 * The junior desk has no display2 socket, so the monitor uses this anchor.
 */
export function storeDrawEntries(
  stage: StageId,
  owned: readonly string[],
  deskBaseline: number | null,
): DrawEntry[] {
  const have = new Set(owned);
  const entries: DrawEntry[] = [];
  for (const row of PLACEMENT.items) {
    if (row.room !== stage || !have.has(row.item)) continue;
    const file = spriteFile(row);
    const x = row.anchor.x - Math.floor(row.size.w / 2);
    const y = row.anchor.y - row.size.h;
    const wall = row.kind === "wall";
    const surface = row.kind === "surface";
    entries.push({
      key: `store:${row.room}:${row.item}`,
      sprite: file,
      bitmap: `/ui/m5/${file}`,
      bitmapW: row.size.w,
      bitmapH: row.size.h,
      x,
      y,
      layer: wall ? LAYER_WALL : LAYER_OBJECT,
      sortBaseline: surface && deskBaseline != null ? deskBaseline : row.anchor.y,
      sortSub: surface ? [40, row.anchor.y, 0] : 0,
      anchor: [row.anchor.x, row.anchor.y],
      hitTest: false,
    });
    const shadow = shadowFor(row);
    if (!shadow) continue;
    entries.push({
      key: `store:${row.room}:${row.item}:shadow`,
      sprite: shadow.file,
      bitmap: `/ui/m5/${shadow.file}`,
      bitmapW: shadow.w,
      bitmapH: shadow.h,
      x: Math.round(row.anchor.x - Math.floor(shadow.w / 2)),
      y: Math.round(row.anchor.y - Math.floor(shadow.h / 2) - 1),
      layer: LAYER_SHADOW,
      sortBaseline: 0,
      sortSub: 0,
      hitTest: false,
    });
  }
  return entries;
}
