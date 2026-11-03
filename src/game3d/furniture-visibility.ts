import { hideChairForPose, type RoomPose } from "./pose";

/**
 * Whether a manifest GLB is drawn.
 * An explicit slot pick (`drawn`) wins over the fresh-student hide list, so
 * equipping Bàn gỗ or a lamp in the student room actually shows the mesh.
 * Desk chairs stay hidden only while the player is on the floor.
 */
export function manifestMeshVisible(args: {
  key: string;
  drawn: ReadonlySet<string>;
  hiddenBySlot: ReadonlySet<string>;
  stage0Hide: ReadonlySet<string>;
  loadoutOnly: boolean;
  pose: RoomPose;
}): boolean {
  if (hideChairForPose(args.pose, args.key)) return false;
  if (args.drawn.has(args.key)) return true;
  if (args.hiddenBySlot.has(args.key)) return false;
  if (args.loadoutOnly) return false;
  return !args.stage0Hide.has(args.key);
}

/** Folding table / laptop. A real desk pick replaces the folding table. */
export function stage0MeshVisible(args: {
  key: string;
  stage0Active: boolean;
  drawn: ReadonlySet<string>;
  realDeskDrawn: boolean;
}): boolean {
  const slotDriven = !args.stage0Active && args.drawn.has(args.key);
  if (args.stage0Active && args.key === "table_folding" && args.realDeskDrawn) return false;
  return args.stage0Active || slotDriven;
}

export function realDeskDrawn(drawn: ReadonlySet<string>): boolean {
  return drawn.has("desk") || drawn.has("senior_standing_desk");
}
