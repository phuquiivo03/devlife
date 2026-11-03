import type { StageId } from "@/game/config";
import { getRoom } from "@/game/content";
import { STORE_TO_KEY } from "./assets";
import { CATALOG_TO_GLB, STORE_SLOT_PREFIX } from "./slot-models";

export type RoomPose = "floor" | "sit" | "stand" | "sleep";

/**
 * Chairs that occupy the desk seat. The floor pose sits between the folding
 * table and this spot, and the seated mesh is deeper than that gap, so these
 * meshes are not drawn while the player is on the floor.
 */
export const SEAT_CHAIR_KEYS: ReadonlySet<string> = new Set([
  "chair_plastic",
  "ergo_chair",
  "junior_office_chair",
  "stool_plastic",
]);

function glbForSeatEntry(entry: string): string | null {
  if (entry.startsWith(STORE_SLOT_PREFIX)) {
    return STORE_TO_KEY[entry.slice(STORE_SLOT_PREFIX.length)] ?? null;
  }
  return CATALOG_TO_GLB[entry] ?? null;
}

/**
 * True when a chair mesh is actually at the desk seat, so the player should
 * use the seated pose. An emptied seat, and the fresh student folding-table
 * scene (no monitor and no ergo chair yet), leave the seat clear for the
 * floor pose.
 */
export function seatDrawsChair(
  stage: StageId,
  loadout: Record<string, string | null | undefined>,
  owned: ReadonlySet<string>,
): boolean {
  const seat = getRoom(stage).slots.find((slot) => slot.id === "seat");
  if (!seat) return false;
  if (seat.id in loadout) {
    const entry = loadout[seat.id];
    if (entry == null) return false;
    const glb = glbForSeatEntry(entry);
    return glb != null && SEAT_CHAIR_KEYS.has(glb);
  }
  // Untouched student seat. The folding-table scene hides the chair; owning
  // the ergo chair, or leaving that scene (a second monitor), puts a chair
  // back at the desk.
  if (stage === "student") {
    if (owned.has("ergo_chair")) return true;
    const foldingTable = !owned.has("monitor2") && !owned.has("ergo_chair");
    return !foldingTable;
  }
  const glb = seat.default ? CATALOG_TO_GLB[seat.default] : null;
  return glb != null && SEAT_CHAIR_KEYS.has(glb);
}

export function poseForRoom(opts: {
  stage: StageId;
  sleeping: boolean;
  owned: readonly string[];
  loadout: Record<string, string | null | undefined>;
}): RoomPose {
  if (opts.sleeping) return "sleep";
  return seatDrawsChair(opts.stage, opts.loadout, new Set(opts.owned)) ? "sit" : "floor";
}

/** Seat chairs are omitted while the player sits on the floor. */
export function hideChairForPose(pose: RoomPose, key: string): boolean {
  return pose === "floor" && SEAT_CHAIR_KEYS.has(key);
}
