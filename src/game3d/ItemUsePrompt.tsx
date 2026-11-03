"use client";

import { Html } from "@react-three/drei";
import { itemUseAction } from "@/game/life/item-use";
import { useGameStore } from "@/game/state/store";
import type { ManifestItem } from "./manifest";

/** Clay chip above a selected item: name plus the Dùng button. */
export function ItemUsePrompt({ item }: { item: ManifestItem }) {
  const action = itemUseAction(item.key);
  const applyUse = useGameStore((s) => s.useRoomItem);
  if (!action) return null;
  const [x, y, z] = item.position;
  return (
    <Html position={[x, y + 1.15, z]} center zIndexRange={[30, 0]} distanceFactor={6}>
      <div
        className="item-use-card"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <p className="item-use-label">{action.label}</p>
        <button type="button" className="item-use-btn" onClick={() => applyUse(item.key)}>
          Dùng
        </button>
      </div>
    </Html>
  );
}
