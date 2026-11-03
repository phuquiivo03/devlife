import type { StageId } from "@/game/config";
import { resolveRoomFurniture, type LoadoutLike, type SlotLike } from "./slot-models";

/**
 * Underside of the seated hips in `player_sit.glb`, metres above the mesh
 * origin (the origin is the dangling feet, not the pelvis).
 */
export const SIT_BUTT_LOCAL_Y = 0.397;

/**
 * Top of the surface the hips rest on, in each chair GLB's local space.
 * Plastic pan, junior office cushion, and the ergo lavender cushion — measured
 * from upward-facing seat vertices, not the backrest.
 */
export const SEAT_TOP_LOCAL_Y: Record<string, number> = {
  chair_plastic: 0.39,
  junior_office_chair: 0.462,
  ergo_chair: 0.413,
};

/** World Y that puts the chibi hips on `chairKey`'s seat. Null for an unknown chair. */
export function sitYOnChair(chairKey: string, chairY: number): number | null {
  const top = SEAT_TOP_LOCAL_Y[chairKey];
  if (top == null) return null;
  return Math.round((chairY + top - SIT_BUTT_LOCAL_Y) * 1000) / 1000;
}

/** Prefer the chair that actually replaced the seat; student baseline is implicit. */
const SEAT_DRAW_ORDER = ["ergo_chair", "junior_office_chair", "chair_plastic"] as const;

/**
 * GLB drawn at the desk seat, or null when the seat slot is empty.
 * Student `chair_plastic` is the manifest baseline (not in `drawn`) until
 * something hides it.
 */
export function activeSeatKey(
  stage: StageId,
  slots: readonly SlotLike[],
  loadout: LoadoutLike,
  owned: ReadonlySet<string>,
): string | null {
  const plan = resolveRoomFurniture(slots, loadout, owned, stage);
  for (const key of SEAT_DRAW_ORDER) {
    if (plan.drawn.has(key)) return key;
  }
  if (stage === "student" && !plan.hidden.has("chair_plastic")) return "chair_plastic";
  return null;
}
