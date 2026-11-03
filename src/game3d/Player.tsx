"use client";

import { useMemo } from "react";
import { useGameStore } from "@/game/state/store";
import { getRoom } from "@/game/content";
import { getRoomManifest, itemByKey } from "./manifest";
import { ItemModel } from "./ItemModel";
import { activeSeatKey, sitYOnChair } from "./sit-height";

export type PlayerPose = "floor" | "sit" | "stand" | "sleep";

/**
 * Pose precedence:
 * 1. sleeping → player hidden (`sleepTransition` runs its own overlay)
 *    // TODO lying pose when a lying GLB lands
 * 2. fresh student room (no monitor2/ergo_chair yet) → sits on the floor at
 *    the folding table + laptop (stage0 set)
 * 3. seat slot emptied (`null`) → also sits on the floor — nothing to sit on
 * 4. otherwise (working or idle) → seated on the chair at the desk
 */
export function usePlayerPose(): PlayerPose {
  const stage = useGameStore((s) => s.stage);
  const hasMonitor2 = useGameStore((s) => s.career.shop?.owned.includes("monitor2") ?? false);
  const hasErgoChair = useGameStore((s) => s.career.shop?.owned.includes("ergo_chair") ?? false);
  const sleeping = useGameStore((s) => s.sleepTransition?.active ?? false);
  const loadout = useGameStore((s) => s.loadouts[s.stage]);

  if (sleeping) return "sleep";
  // The fresh-student floor scene ships as-is (folding table + laptop).
  if (stage === "student" && !hasMonitor2 && !hasErgoChair) return "floor";
  // No chair in the seat slot (explicit `null`) → sitting on the floor.
  const seatSlot = getRoom(stage).slots.find((slot) => slot.id === "seat");
  if (seatSlot && seatSlot.id in loadout && loadout[seatSlot.id] === null) {
    return "floor";
  }
  return "sit";
}

/** The three pose models stay mounted; visibility toggles per current pose. */
export function Player() {
  const pose = usePlayerPose();
  const showCharacter = useGameStore((s) => s.showCharacter);
  const stage = useGameStore((s) => s.stage);
  const loadout = useGameStore((s) => s.loadouts[stage]);
  const owned = useGameStore((s) => s.career.shop?.owned);
  const poses = getRoomManifest(stage).poses;
  const ownedSet = useMemo(() => new Set(owned ?? []), [owned]);
  // Hips follow whichever chair is actually in the seat. The manifest Y is the
  // room's default chair; ergo_chair's cushion is a different height.
  const sitY = useMemo(() => {
    const seat = activeSeatKey(stage, getRoom(stage).slots, loadout, ownedSet);
    if (!seat) return null;
    const chair = itemByKey(stage, seat);
    if (!chair) return null;
    return sitYOnChair(seat, chair.position[1] ?? 0);
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
            visible={showCharacter && pose === name}
          />
        );
      })}
    </>
  );
}
