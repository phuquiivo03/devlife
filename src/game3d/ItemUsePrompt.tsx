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
  // The room camera is orthographic. drei multiplies `distanceFactor` by
  // `camera.zoom` (hundreds), which blows this chip up until the violet
  // button covers the canvas. Leave the scale at 1 so it stays a CSS chip.
  return (
    <Html
      position={[x, y + 0.45, z]}
      center
      zIndexRange={[30, 0]}
      wrapperClass="item-use-anchor"
      style={{ pointerEvents: "none" }}
    >
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
