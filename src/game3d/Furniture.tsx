"use client";

import { useMemo } from "react";
import { useGameStore } from "@/game/state/store";
import { getRoom } from "@/game/content";
import { isOwnedOnly, STORE_TO_KEY } from "./assets";
import { STUDENT_MANIFEST } from "./manifest";
import { resolveRoomFurniture } from "./slot-models";
import { ItemModel } from "./ItemModel";
import { usePlayerPose } from "./Player";

/** Invert STORE_TO_KEY so manifest item keys can ask "is this owned?". */
const KEY_TO_STORE: ReadonlyMap<string, string> = new Map(
  Object.entries(STORE_TO_KEY).map(([storeId, key]) => [key, storeId]),
);

/**
 * Slot-driven room furniture:
 * - room shell always visible
 * - slots follow the loadout (see slot-models.ts): untouched slots keep the
 *   shipped scene, a loadout entry replaces/overlays/empties the slot
 * - keys outside every slot (aircon, lamp_desk, …) stay owned-gated
 * - the floor pose hides the desk set via stage0.hide
 */
export function Furniture() {
  const owned = useGameStore((s) => s.career.shop?.owned);
  const stage = useGameStore((s) => s.stage);
  const loadout = useGameStore((s) => s.loadouts[stage]);
  const pose = usePlayerPose();
  const floorPose = pose === "floor";

  const ownedSet = useMemo(() => new Set(owned ?? []), [owned]);

  const plan = useMemo(
    () => resolveRoomFurniture(getRoom(stage).slots, loadout, ownedSet),
    [stage, loadout, ownedSet],
  );

  const hidden = useMemo(
    () => new Set<string>(floorPose ? STUDENT_MANIFEST.stage0.hide : []),
    [floorPose],
  );

  const visibleFor = (key: string): boolean => {
    if (key in plan.visible) return plan.visible[key] && !hidden.has(key);
    if (isOwnedOnly(key)) {
      const storeId = KEY_TO_STORE.get(key);
      return storeId != null && ownedSet.has(storeId) && !hidden.has(key);
    }
    return !hidden.has(key);
  };

  return (
    <>
      {STUDENT_MANIFEST.items.map((item) => {
        if (item.category === "room_shell") return null;
        if (item.missing) return null;
        const override = plan.positionOverrides[item.key];
        return (
          <ItemModel
            key={item.key}
            item={override ? { ...item, position: override } : item}
            visible={visibleFor(item.key)}
            spinBlades={item.key === "fan_standing"}
          />
        );
      })}
      {STUDENT_MANIFEST.stage0.items.map((item) => {
        if (item.missing) return null;
        // Floor pose draws the stage0 set as shipped; outside it these GLBs
        // (folding table, laptop) only appear when a slot pick resolves to
        // them — at the overridden desk position where needed.
        const slotDriven = !floorPose && plan.visible[item.key] === true;
        const override = plan.positionOverrides[item.key];
        return (
          <ItemModel
            key={`stage0:${item.key}`}
            item={override ? { ...item, position: override } : item}
            visible={floorPose || slotDriven}
          />
        );
      })}
    </>
  );
}
