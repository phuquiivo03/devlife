import { BUTTON_UI_SCALE, buttonMetrics, type ButtonScale } from "@/components/ui/button/config";
import { foodDockMetrics } from "@/game/life/m51-art";
import { hungerLabel, type HungerId } from "@/game/life/hunger";

/**
 * Rice-bowl hunger pulse. The bowl icon blinks; there is no badge.
 * Opacity and brightness only — the icon does not move or scale.
 *
 * Hơi đói is the slow, faint pulse. Đói is shorter and dips further,
 * so the two read as different strengths. No (`full`) has no entry
 * and does not animate.
 *
 * `prefers-reduced-motion` skips the pulse and holds `stillOpacity`
 * and `stillBrightness` (a static tint: faint for Hơi đói, stronger
 * for Đói). Documented in `docs/systems/life.md` and
 * `docs/systems/buttons.md`.
 */
export const HUNGER_BOWL_BLINK = {
  peckish: {
    /** Full cycle. Long enough that the dip reads as a slow breath. */
    durationMs: 2200,
    /** Lowest opacity at the middle of the pulse. Close to 1, so the dip stays faint. */
    minOpacity: 0.78,
    /** Lowest `brightness()` at the middle of the pulse. */
    minBrightness: 0.94,
    /** Held opacity when motion is reduced. */
    stillOpacity: 0.9,
    /** Held `brightness()` when motion is reduced. */
    stillBrightness: 0.96,
  },
  hungry: {
    /** Full cycle. Clearly faster than the peckish breath. */
    durationMs: 700,
    /** Lowest opacity. A deep dip, so Đói is obvious next to Hơi đói. */
    minOpacity: 0.45,
    /** Lowest `brightness()`. Dimmer than the peckish floor. */
    minBrightness: 0.7,
    /** Held opacity when motion is reduced. Darker than the peckish tint. */
    stillOpacity: 0.62,
    /** Held `brightness()` when motion is reduced. */
    stillBrightness: 0.78,
  },
} as const;

export type HungerBlinkLevel = keyof typeof HUNGER_BOWL_BLINK;

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

/** Leading word on the bowl tooltip. The level comes from `hungerLabel`. */
export const FOOD_TIP_ACTION = "Ăn";

/** Shared tooltip and `aria-label`, e.g. "Ăn · Hơi đói". */
export function foodHungerTip(level: HungerId): string {
  return `${FOOD_TIP_ACTION} · ${hungerLabel(level)}`;
}

/** Custom properties for `.bowlBlink`. Full returns nothing — the bowl stays still. */
export function hungerBowlBlinkStyle(level: HungerId): Record<`--${string}`, string> | undefined {
  if (level === "full") return undefined;
  const blink = HUNGER_BOWL_BLINK[level];
  return {
    "--hunger-blink-ms": `${blink.durationMs}ms`,
    "--hunger-min-opacity": String(blink.minOpacity),
    "--hunger-min-brightness": String(blink.minBrightness),
    "--hunger-still-opacity": String(blink.stillOpacity),
    "--hunger-still-brightness": String(blink.stillBrightness),
  };
}
