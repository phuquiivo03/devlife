"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "@/game/state/store";
import { getRoom } from "@/game/content";
import { itemUseAction } from "@/game/life/item-use";
import { isLoadoutOnly } from "./assets";
import { ItemUsePrompt } from "./ItemUsePrompt";
import { STUDENT_MANIFEST, getRoomManifest, type ManifestItem } from "./manifest";
import { ItemModel } from "./ItemModel";
import { hideChairForPose } from "./pose";
import { usePlayerPose } from "./Player";
import { resolveRoomFurniture } from "./slot-models";

/**
 * Slot-driven room furniture:
 * - room shell always visible
 * - slots follow the loadout (see slot-models.ts): untouched slots keep the
 *   shipped scene, a loadout entry replaces/overlays/empties the slot
 * - store items (aircon, lamp_desk, …) draw only when a slot resolves to
 *   them — ownership alone never renders anything
 * - the fresh-student scene (no monitor2/ergo_chair owned) swaps in the
 *   stage0 set (folding table + laptop) and hides the desk set
 * - while the player sits on the floor, desk chairs stay out of that spot
 */
export function Furniture() {
  const owned = useGameStore((s) => s.career.shop?.owned);
  const stage = useGameStore((s) => s.stage);
  const loadout = useGameStore((s) => s.loadouts[stage]);
  const pose = usePlayerPose();
  const [selected, setSelected] = useState<string | null>(null);

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
    if (hideChairForPose(pose, key)) return false;
    if (plan.drawn.has(key)) return !hidden.has(key);
    if (plan.hidden.has(key)) return false;
    // Store items need a slot to resolve to them; base furniture ships as-is.
    if (isLoadoutOnly(key)) return false;
    return !hidden.has(key);
  };

  const selectItem = (key: string) => {
    if (!itemUseAction(key)) return;
    setSelected((current) => (current === key ? null : key));
  };

  return (
    <>
      {manifest.items.map((item) => {
        if (item.category === "room_shell") return null;
        if (item.missing) return null;
        const override = plan.positionOverrides[item.key];
        const placed = override ? { ...item, position: override } : item;
        const visible = visibleFor(item.key);
        return (
          <ItemModel
            key={item.key}
            item={placed}
            visible={visible}
            spinBlades={item.key === "fan_standing"}
            onSelect={visible ? selectItem : undefined}
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
        const placed = override ? { ...item, position: override } : item;
        const visible = stage0Active || slotDriven;
        return (
          <ItemModel
            key={`stage0:${item.key}`}
            item={placed}
            visible={visible}
            onSelect={visible ? selectItem : undefined}
          />
        );
      })}
      <SelectedUsePrompt
        selected={selected}
        items={[...manifest.items, ...manifest.stage0.items]}
        visibleFor={(key) => {
          const stage0 = manifest.stage0.items.some((item) => item.key === key);
          if (stage0 && (stage0Active || plan.drawn.has(key))) return true;
          return visibleFor(key);
        }}
      />
    </>
  );
}

function SelectedUsePrompt({
  selected,
  items,
  visibleFor,
}: {
  selected: string | null;
  items: readonly ManifestItem[];
  visibleFor: (key: string) => boolean;
}) {
  if (!selected || !visibleFor(selected)) return null;
  const item = items.find((entry) => entry.key === selected);
  if (!item) return null;
  return <ItemUsePrompt item={item} />;
}
