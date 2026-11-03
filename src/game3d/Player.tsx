"use client";

import { useMemo } from "react";
import { useGameStore } from "@/game/state/store";
import { getRoom } from "@/game/content";
import { getRoomManifest, itemByKey } from "./manifest";
import { ItemModel } from "./ItemModel";
import { poseForRoom, type RoomPose } from "./pose";
import { resolveRoomFurniture } from "./slot-models";
import { activeSeatKey, sitYOnChair } from "./sit-height";

export type PlayerPose = RoomPose;

/**
 * Pose precedence:
 * 0. fainting → static meshes hide; FaintPlayer plays `fall` and holds the last frame
 * 1. sleeping → player hidden (`sleepTransition` runs its own overlay)
 *    // TODO lying pose when a lying GLB lands
 * 2. a chair is at the desk seat → seated on that chair
 * 3. otherwise (fresh folding table, or the seat slot emptied) → floor pose
 *
 * Sit height comes from the chair that is actually drawn (`sit-height.ts`):
 * the manifest Y is the room default, and ergo_chair's cushion is different.
 */
export function usePlayerPose(): PlayerPose {
  const stage = useGameStore((s) => s.stage);
  const owned = useGameStore((s) => s.career.shop?.owned ?? []);
  const sleeping = useGameStore((s) => s.sleepTransition?.active ?? false);
  const loadout = useGameStore((s) => s.loadouts[s.stage]);
  return poseForRoom({ stage, sleeping, owned, loadout });
}

/** The three pose models stay mounted; visibility toggles per current pose. */
export function Player() {
  const pose = usePlayerPose();
  const showCharacter = useGameStore((s) => s.showCharacter);
  const fainting = useGameStore((s) => s.faint != null);
  const stage = useGameStore((s) => s.stage);
  const loadout = useGameStore((s) => s.loadouts[stage]);
  const owned = useGameStore((s) => s.career.shop?.owned);
  const poses = getRoomManifest(stage).poses;
  const ownedSet = useMemo(() => new Set(owned ?? []), [owned]);
  // Hips follow whichever chair is actually in the seat. The manifest Y is the
  // room's default chair; ergo_chair's cushion is a different height.
  const sitY = useMemo(() => {
    const slots = getRoom(stage).slots;
    const plan = resolveRoomFurniture(slots, loadout, ownedSet, stage);
    const seat = activeSeatKey(stage, slots, loadout, ownedSet);
    if (!seat) return null;
    const chair = itemByKey(stage, seat);
    const y = plan.positionOverrides[seat]?.[1] ?? chair?.position[1];
    if (y == null) return null;
    return sitYOnChair(seat, y);
  }, [stage, loadout, ownedSet]);

  return (
    <>
      {(Object.keys(poses) as Array<keyof typeof poses>).map((name) => {
        const item = poses[name];
        if (item.missing) return null;
        const positioned =
          name === "sit" && sitY != null
            ? { ...item, position: [item.position[0], sitY, item.position[2]] }
            : item;
        return (
          <ItemModel
            key={`pose:${name}`}
            item={positioned}
            kind="character"
            visible={showCharacter && pose === name && !fainting}
          />
        );
      })}
    </>
  );
}
