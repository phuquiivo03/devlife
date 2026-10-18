import { BUTTON_UI_SCALE, buttonMetrics, type ButtonScale } from "@/components/ui/button/config";
import { STORE_GRID } from "./store-grid.config";

/**
 * HUD shop control. The icon is `icon_btn_store` (24×24 native, 48×48 at 2×).
 * Distances that the art file does not spell out live here and in
 * `docs/systems/buttons.md`.
 */

export const STORE_LABEL = "Cửa hàng";

/** Native size of `icon_btn_store`. The HUD draws the `_x2` sheet at 2×. */
export const STORE_ICON_NATIVE_PX = 24;

/** CSS pixels between icons on the HUD icon bar. Đi ngủ stays on that bar. */
export const HUD_ICON_GAP_PX = 8;

/**
 * Shop dialog width. Four columns from `STORE_GRID`, plus the gaps and the
 * modal padding. The old single 192px card used 280.
 */
export const STORE_MODAL_MAX_PX = STORE_GRID.modalMaxPx;

export function storeIconFile(scale: ButtonScale = BUTTON_UI_SCALE): string {
  return scale === 2 ? "icon_btn_store_x2.png" : "icon_btn_store.png";
}

export function storeButtonMetrics(scale: ButtonScale = BUTTON_UI_SCALE) {
  const borderPx = buttonMetrics(scale).slicePx;
  const iconPx = STORE_ICON_NATIVE_PX * scale;
  return {
    scale,
    iconPx,
    /** Outer box: the shop icon fills the 9-slice center, so the frame stays outside it. */
    buttonPx: iconPx + borderPx * 2,
  };
}
