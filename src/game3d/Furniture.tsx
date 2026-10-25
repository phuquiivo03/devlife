"use client";

import { useMemo } from "react";
import { useGameStore } from "@/game/state/store";
import { isOwnedOnly, MISSING_KEYS, STORE_TO_KEY } from "./assets";
import { STUDENT_MANIFEST } from "./manifest";
import { ItemModel } from "./ItemModel";
import { usePlayerPose } from "./Player";

/** Invert STORE_TO_KEY so manifest item keys can ask "is this owned?". */
const KEY_TO_STORE: ReadonlyMap<string, string> = new Map(
  Object.entries(STORE_TO_KEY).map(([storeId, key]) => [key, storeId]),
);

/**
 * All non-shell furniture/decor:
 * - base items always visible (minus the stage0 desk set in the floor pose)
 * - store items only when owned (and their GLB actually shipped)
 * - ergo_chair replaces chair_plastic at the seat when owned
 */
export function Furniture() {
  const owned = useGameStore((s) => s.career.shop?.owned);
  const pose = usePlayerPose();
  const floorPose = pose === "floor";

  const hidden = useMemo(() => {
    const hide = new Set<string>(floorPose ? STUDENT_MANIFEST.stage0.hide : []);
    if (owned?.includes("ergo_chair") && !MISSING_KEYS.has("ergo_chair")) {
      hide.add("chair_plastic");
    }
    if (owned?.includes("bed_vip") && !MISSING_KEYS.has("bed_vip")) {
      hide.add("bed");
    }
    return hide;
  }, [owned, floorPose]);

  const ownedSet = useMemo(() => new Set(owned ?? []), [owned]);

  return (
    <>
      {STUDENT_MANIFEST.items.map((item) => {
        if (item.category === "room_shell") return null;
        if (item.missing) return null;
        if (isOwnedOnly(item.key)) {
          const storeId = KEY_TO_STORE.get(item.key);
          return (
            <ItemModel
              key={item.key}
              item={item}
              visible={storeId != null && ownedSet.has(storeId) && !hidden.has(item.key)}
              spinBlades={item.key === "fan_standing"}
            />
          );
        }
        return (
          <ItemModel
            key={item.key}
            item={item}
            visible={!hidden.has(item.key)}
            spinBlades={item.key === "fan_standing"}
          />
        );
      })}
      {STUDENT_MANIFEST.stage0.items.map((item) =>
        item.missing ? null : (
          <ItemModel key={`stage0:${item.key}`} item={item} visible={floorPose} />
        ),
      )}
    </>
  );
}
