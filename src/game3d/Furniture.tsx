"use client";

import { useMemo } from "react";
import { useGameStore } from "@/game/state/store";
import { getRoom } from "@/game/content";
import { itemUseAction } from "@/game/life/item-use";
import { isLoadoutOnly } from "./assets";
import { manifestMeshVisible, realDeskDrawn, stage0MeshVisible } from "./furniture-visibility";
import { STUDENT_MANIFEST, getRoomManifest } from "./manifest";
import { ItemModel } from "./ItemModel";
import { usePlayerPose } from "./Player";
import { laptopDeskSpot, resolveRoomFurniture } from "./slot-models";

/**
 * Slot-driven room furniture:
 * - room shell always visible
 * - slots follow the loadout (see slot-models.ts): untouched slots keep the
 *   shipped scene, a loadout entry replaces/overlays/empties the slot
 * - store items (aircon, lamp_desk, …) draw only when a slot resolves to
 *   them — ownership alone never renders anything
 * - the fresh-student scene (no monitor2/ergo_chair owned) swaps in the
 *   stage0 set (folding table + laptop) and hides the desk set, unless the
 *   player has explicitly equipped one of those meshes
 * - while the player sits on the floor, desk chairs stay out of that spot
 * - a click on a usable mesh applies its action; a drag orbits the camera
 */
export function Furniture() {
  const owned = useGameStore((s) => s.career.shop?.owned);
  const stage = useGameStore((s) => s.stage);
  const loadout = useGameStore((s) => s.loadouts[stage]);
  const pose = usePlayerPose();
  const applyUse = useGameStore((s) => s.useRoomItem);

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
  const stage0Hide = useMemo(
    () => new Set<string>(stage0Active ? STUDENT_MANIFEST.stage0.hide : []),
    [stage0Active],
  );
  const deskDrawn = realDeskDrawn(plan.drawn);

  const visibleFor = (key: string): boolean =>
    manifestMeshVisible({
      key,
      drawn: plan.drawn,
      hiddenBySlot: plan.hidden,
      stage0Hide,
      loadoutOnly: isLoadoutOnly(key),
      pose,
    });

  const onUse = (key: string) => {
    if (!itemUseAction(key)) return;
    applyUse(key);
  };

  return (
    <>
      {manifest.items.map((item) => {
        if (item.category === "room_shell") return null;
        if (item.missing) return null;
        const override = plan.positionOverrides[item.key];
        const placed = override ? { ...item, position: override } : item;
        const visible = visibleFor(item.key);
        const usable = visible && itemUseAction(item.key) != null;
        return (
          <ItemModel
            key={item.key}
            item={placed}
            visible={visible}
            spinBlades={item.key === "fan_standing"}
            onUse={usable ? onUse : undefined}
          />
        );
      })}
      {manifest.stage0.items.map((item) => {
        if (item.missing) return null;
        // The fresh-student scene draws the stage0 set as shipped; otherwise
        // these GLBs (folding table, laptop) only appear when a slot pick
        // resolves to them — at the overridden position where needed.
        const override = plan.positionOverrides[item.key];
        const onDesk = stage0Active && item.key === "laptop" && deskDrawn;
        const position = override ?? (onDesk ? laptopDeskSpot(stage) : item.position);
        const placed = position === item.position ? item : { ...item, position };
        const visible = stage0MeshVisible({
          key: item.key,
          stage0Active,
          drawn: plan.drawn,
          realDeskDrawn: deskDrawn,
        });
        const usable = visible && itemUseAction(item.key) != null;
        return (
          <ItemModel
            key={`stage0:${item.key}`}
            item={placed}
            visible={visible}
            onUse={usable ? onUse : undefined}
          />
        );
      })}
    </>
  );
}
