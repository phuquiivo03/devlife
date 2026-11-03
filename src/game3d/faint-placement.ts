import type { StageId } from "@/game/config";
import { getRoomManifest } from "./manifest";
import { poseForRoom } from "./pose";

/**
 * Where the animated body falls. Sitting (chair or floor) swaps to the
 * standing clip at that spot: same facing and floor position, feet on the
 * ground instead of on the cushion.
 */
export function faintPlacement(opts: {
  stage: StageId;
  owned: readonly string[];
  loadout: Record<string, string | null | undefined>;
}): { position: [number, number, number]; rotationY: number } {
  const pose = poseForRoom({ ...opts, sleeping: false });
  const poses = getRoomManifest(opts.stage).poses;
  const source = pose === "sit" ? poses.sit : poses.floor;
  const y = pose === "sit" ? (poses.stand.position[1] ?? 0) : (source.position[1] ?? 0);
  return {
    position: [source.position[0] ?? 0, y, source.position[2] ?? 0],
    rotationY: source.rotationY,
  };
}
