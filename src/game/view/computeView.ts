import { MIN_VIEW_W, PORTRAIT_SCENE_MAX_H, WORLD } from "../config";
import type { ViewState } from "../types";

export type ComputeViewInput = {
  areaCssW: number;
  areaCssH: number;
  dpr: number;
  portrait: boolean;
  focusX: number;
  cameraX: number | null;
};

export function computeView(input: ComputeViewInput): ViewState {
  const { areaCssW, areaCssH, dpr, portrait, focusX } = input;
  const devW = Math.floor(areaCssW * dpr);
  const devH = Math.floor(areaCssH * dpr);

  if (!portrait) {
    const scale = Math.max(
      1,
      Math.min(
        Math.floor(devW / MIN_VIEW_W),
        Math.floor((PORTRAIT_SCENE_MAX_H * devH) / WORLD.h),
      ),
    );

    const finalScale = Math.min(scale, 2);

    // Số game pixel cần hiển thị để canvas phủ kín vùng chứa
    const viewW = Math.min(WORLD.w, Math.ceil(devW / finalScale));

    const viewH = WORLD.h;

    const camera =
      input.cameraX !== null ? input.cameraX : focusX - Math.floor(viewW / 2);

    const cameraX = Math.max(0, Math.min(WORLD.w - viewW, Math.round(camera)));

    // Giữ nguyên kích thước CSS của vùng chứa
    const cssW = areaCssW;
    const cssH = (WORLD.h * cssW) / viewW;

    return {
      mode: "crop",
      scale: finalScale,
      viewW,
      viewH,
      cameraX,
      cssW,
      cssH,
      dpr,
    };
  }

  const scale = Math.max(
    1,
    Math.min(
      Math.floor(devW / MIN_VIEW_W),
      Math.floor((PORTRAIT_SCENE_MAX_H * devH) / WORLD.h),
    ),
  );
  // Use consistent scale logic for all screen sizes, capped at 2x for quality
  const finalScale = Math.min(scale, 2);
  const viewW = Math.min(WORLD.w, Math.floor(devW / finalScale));
  const viewH = WORLD.h;
  const camera =
    input.cameraX !== null ? input.cameraX : focusX - Math.floor(viewW / 2);
  const cameraX = Math.max(0, Math.min(WORLD.w - viewW, Math.round(camera)));
  const cssW = (viewW * finalScale) / dpr;
  const cssH = (viewH * finalScale) / dpr;
  return {
    mode: "crop",
    scale: finalScale,
    viewW,
    viewH,
    cameraX,
    cssW,
    cssH,
    dpr,
  };
}
