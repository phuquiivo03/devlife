"use client";

import { useMemo } from "react";
import { useGameStore } from "@/game/state/store";
import { getRoom } from "@/game/content";
import { isLoadoutOnly } from "./assets";
import { STUDENT_MANIFEST, getRoomManifest } from "./manifest";
import { resolveRoomFurniture } from "./slot-models";
import { ItemModel } from "./ItemModel";

/**
 * Slot-driven room furniture:
 * - room shell always visible
 * - slots follow the loadout (see slot-models.ts): untouched slots keep the
 *   shipped scene, a loadout entry replaces/overlays/empties the slot
 * - store items (aircon, lamp_desk, …) draw only when a slot resolves to
 *   them — ownership alone never renders anything
 * - the fresh-student scene (no monitor2/ergo_chair owned) swaps in the
 *   stage0 set (folding table + laptop) and hides the desk set — independent
 *   of the player pose, which floors separately when the seat is emptied
 */
export function Furniture() {
  const owned = useGameStore((s) => s.career.shop?.owned);
  const stage = useGameStore((s) => s.stage);
  const loadout = useGameStore((s) => s.loadouts[stage]);

  const ownedSet = useMemo(() => new Set(owned ?? []), [owned]);

  const plan = useMemo(
    () => resolveRoomFurniture(getRoom(stage).slots, loadout, ownedSet, stage),
    [stage, loadout, ownedSet],
  );

  const stage0Active =
    stage === "student" && !ownedSet.has("monitor2") && !ownedSet.has("ergo_chair");

  // Junior/senior ship an empty stage0 — their default look comes from the
  // slot defaults drawn by resolveRoomFurniture, not a stage0 swap.
  const manifest = getRoomManifest(stage);

  const hidden = useMemo(
    () => new Set<string>(stage0Active ? STUDENT_MANIFEST.stage0.hide : []),
    [stage0Active],
  );

  const visibleFor = (key: string): boolean => {
    if (plan.drawn.has(key)) return !hidden.has(key);
    if (plan.hidden.has(key)) return false;
    // Store items need a slot to resolve to them; base furniture ships as-is.
    if (isLoadoutOnly(key)) return false;
    return !hidden.has(key);
  };

  return (
    <>
      {manifest.items.map((item) => {
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
      {manifest.stage0.items.map((item) => {
        if (item.missing) return null;
        // The fresh-student scene draws the stage0 set as shipped; otherwise
        // these GLBs (folding table, laptop) only appear when a slot pick
        // resolves to them — at the overridden position where needed.
        const slotDriven = !stage0Active && plan.drawn.has(item.key);
        const override = plan.positionOverrides[item.key];
        return (
          <ItemModel
            key={`stage0:${item.key}`}
            item={override ? { ...item, position: override } : item}
            visible={stage0Active || slotDriven}
          />
        );
      })}
    </>
  );
}
