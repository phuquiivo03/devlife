import { BUTTON_UI_SCALE, buttonMetrics, type ButtonScale } from "@/components/ui/button/config";
import { foodDockMetrics } from "@/game/life/m51-art";
import { LIFE } from "@/game/life/content";

/**
 * HUD Ăn button. The bowl sits in a `PixelButton` icon face.
 * The outer box matches Đi ngủ: the native bowl at this scale, plus the two 9-slice borders.
 */
export function foodButtonMetrics(scale: ButtonScale = BUTTON_UI_SCALE) {
  const iconPx = foodDockMetrics(scale).foodPx;
  const borderPx = buttonMetrics(scale).slicePx;
  return {
    scale,
    iconPx,
    buttonPx: iconPx + borderPx * 2,
  };
}

/** Leading word on the bowl tooltip. */
export const FOOD_TIP_ACTION = "Ăn";

/** Tooltip and `aria-label`: the block reason when not hungry enough, else the plain action. */
export function foodDockTip(blockedReason: string | null): string {
  return blockedReason ?? FOOD_TIP_ACTION;
}

/** The Ăn button is disabled at or above `fullness_eat_below`, with this reason on the tooltip. */
export function foodEatBlockReason(fullness: number): string | null {
  if (!(fullness >= LIFE.fullness_eat_below)) return null;
  return LIFE.fullness_eat_block;
}

/** The amber dot marks an available meal: fullness under `fullness_eat_below`. */
export function foodDotVisible(fullness: number): boolean {
  return fullness < LIFE.fullness_eat_below;
}
