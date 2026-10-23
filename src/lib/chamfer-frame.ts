import type { CSSProperties } from "react";

/** Chamfer frame geometry at 427px room width (prototype reference). */
export const CHAMFER_BASE_ROOM_W = 427;

export type ChamferLayer = {
  cornerPx: number;
  paddingPx: number;
};

export const CHAMFER_LAYERS = {
  f1: { cornerPx: 16, paddingPx: 3 },
  f2: { cornerPx: 14, paddingPx: 3 },
  f3: { cornerPx: 12, paddingPx: 7 },
  f5: { cornerPx: 6, paddingPx: 0 },
  plate: { cornerPx: 6, paddingPx: 0 },
} as const;

export function chamferScale(roomWidthPx: number): number {
  return Math.max(0.75, roomWidthPx / CHAMFER_BASE_ROOM_W);
}

export function scaledChamfer(
  layer: ChamferLayer,
  scale: number,
): { corner: number; padding: number } {
  return {
    corner: layer.cornerPx * scale,
    padding: layer.paddingPx * scale,
  };
}

export const FRAME_PAD_PER_SIDE =
  CHAMFER_LAYERS.f1.paddingPx +
  CHAMFER_LAYERS.f2.paddingPx +
  CHAMFER_LAYERS.f3.paddingPx;

/**
 * CSS canvas size that keeps the purple frame inside the slot.
 * When the integer-scaled canvas already fits, the size is unchanged.
 */
export function canvasCssWithinFrame(
  cssW: number,
  cssH: number,
  slotW: number,
  slotH: number,
): { cssW: number; cssH: number } {
  if (slotW <= 0 || slotH <= 0) return { cssW, cssH };
  const scale = chamferScale(Math.min(cssW, slotW));
  const inset = FRAME_PAD_PER_SIDE * scale;
  const maxW = Math.max(1, slotW - inset * 2);
  const maxH = Math.max(1, slotH - inset * 2);
  if (cssW <= maxW && cssH <= maxH) return { cssW, cssH };
  // Trên mobile, tránh fit quá nhỏ - giữ canvas tối thiểu 80% slot width
  const minFit = 0.8;
  const fit = Math.max(minFit, Math.min(maxW / cssW, maxH / cssH));
  return { cssW: cssW * fit, cssH: cssH * fit };
}

export function chamferClipStyle(cornerPx: number): CSSProperties {
  const c = `${cornerPx}px`;
  return {
    clipPath: `polygon(${c} 0, calc(100% - ${c}) 0, 100% ${c}, 100% calc(100% - ${c}), calc(100% - ${c}) 100%, ${c} 100%, 0 calc(100% - ${c}), 0 ${c})`,
  };
}
