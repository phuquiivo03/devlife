"use client";

import { useGameStore } from "@/game/state/store";
import { STUDENT_MANIFEST } from "./manifest";
import { ItemModel } from "./ItemModel";

export type PlayerPose = "floor" | "sit" | "stand" | "sleep";

/**
 * Pose precedence:
 * 1. sleeping → player hidden (`sleepTransition` runs its own overlay)
 *    // TODO lying pose when a lying GLB lands
 * 2. fresh student room (no monitor2/ergo_chair yet) → sits on the floor at
 *    the folding table + laptop (stage0 set)
 * 3. otherwise (working or idle) → seated on the chair at the desk
 */
export function usePlayerPose(): PlayerPose {
  const stage = useGameStore((s) => s.stage);
  const hasMonitor2 = useGameStore((s) => s.career.shop?.owned.includes("monitor2") ?? false);
  const hasErgoChair = useGameStore((s) => s.career.shop?.owned.includes("ergo_chair") ?? false);
  const sleeping = useGameStore((s) => s.sleepTransition?.active ?? false);

  if (sleeping) return "sleep";
  if (stage === "student" && !hasMonitor2 && !hasErgoChair) return "floor";
  return "sit";
}

/** The three pose models stay mounted; visibility toggles per current pose. */
export function Player() {
  const pose = usePlayerPose();
  const showCharacter = useGameStore((s) => s.showCharacter);

  return (
    <>
      {(Object.keys(STUDENT_MANIFEST.poses) as Array<keyof typeof STUDENT_MANIFEST.poses>).map(
        (name) => {
          const item = STUDENT_MANIFEST.poses[name];
          if (item.missing) return null;
          return (
            <ItemModel
              key={`pose:${name}`}
              item={item}
              kind="character"
              visible={showCharacter && pose === name}
            />
          );
        },
      )}
    </>
  );
}
