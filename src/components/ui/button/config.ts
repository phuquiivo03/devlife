import sliceDoc from "../../../../public/ui/m5_1/slices.json";

/**
 * Pixel-3D button metrics. Slice insets come from the art file
 * `public/ui/m5_1/slices.json` (`ui_btn_*`). The pressed face is already
 * drawn lower in that sheet; the label moves by the same distance.
 */

/** Variants that ship their own `ui_btn_*` sheets. `light` reuses secondary. */
export const BUTTON_SKIN_VARIANTS = ["primary", "secondary", "danger", "icon"] as const;
export type ButtonSkinVariant = (typeof BUTTON_SKIN_VARIANTS)[number];

export const BUTTON_VARIANTS = [...BUTTON_SKIN_VARIANTS, "light"] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_STATES = ["normal", "hover", "pressed"] as const;
export type ButtonState = (typeof BUTTON_STATES)[number];

export const BUTTON_SCALES = [1, 2] as const;
export type ButtonScale = (typeof BUTTON_SCALES)[number];

/** Asset key prefixes. Files are `${key}_${state}.png` and `${key}_${state}_x2.png`. */
export const BUTTON_ASSET_KEYS = {
  primary: "ui_btn_primary",
  secondary: "ui_btn_secondary",
  danger: "ui_btn_danger",
  icon: "ui_btn_icon",
  /** Same 9-slice as the notice Ăn / Xem job buttons. */
  light: "ui_btn_secondary",
} as const;

/**
 * Light face shared by notice actions and the other text buttons (M5.2 L4).
 * The background and border match the secondary sheet (`ui_btn_secondary_normal_x2`:
 * face `#E8E2F4`, pixel edge `#1E1428`). Ink is the foreground. Weight stays 400:
 * Galmuri11-Bold has no Vietnamese glyphs, and the notice labels are this face.
 * `--btn-light-*` in `src/app/globals.css` repeats these values.
 */
export const BUTTON_LIGHT = {
  background: "#E8E2F4",
  border: "#1E1428",
  ink: "#2A2548",
  weight: 400,
  /** Galmuri7. Same size as the notice action label. */
  labelPx: 16,
  /** Integer half of the 44px HUD icons, so the bitmap stays crisp. */
  iconPx: 22,
} as const;

/**
 * M5 frames are drawn at 2× native (see the dialog and store frames).
 * The `_x2` sheet is used at that scale so each art pixel is one CSS pixel.
 */
export const BUTTON_UI_SCALE = 2 satisfies ButtonScale;

/** Horizontal padding inside the stretchy center, CSS px. */
export const BUTTON_PAD_X_PX = 8;

/** Gap between an icon and a label inside one button, CSS px. */
export const BUTTON_GAP_PX = 8;

/** Focus ring thickness, CSS px. */
export const BUTTON_FOCUS_PX = 2;

export const BUTTON_INK: Record<ButtonVariant, string> = {
  primary: "#FFFFFF",
  secondary: BUTTON_LIGHT.ink,
  danger: "#FFFFFF",
  icon: BUTTON_LIGHT.ink,
  light: BUTTON_LIGHT.ink,
};

type ButtonSliceEntry = {
  size: [number, number];
  slice: number;
  files: string;
  note: string;
};

const buttonSlice = sliceDoc["ui_btn_*"] as ButtonSliceEntry;

if (!buttonSlice || typeof buttonSlice.slice !== "number" || buttonSlice.slice <= 0) {
  throw new Error("public/ui/m5_1/slices.json is missing a ui_btn_* slice");
}

const pressMatch = buttonSlice.note.match(/(\d+)\s*px/);
if (!pressMatch) {
  throw new Error("public/ui/m5_1/slices.json ui_btn_* note is missing the press shift");
}

export const BUTTON_SLICE = buttonSlice;

/** Native pixels the pressed face sits lower. The label uses this same shift. */
export const BUTTON_PRESS_FACE_SHIFT_PX = Number(pressMatch[1]);

export function buttonAssetFile(
  variant: ButtonVariant,
  state: ButtonState,
  scale: ButtonScale,
): string {
  const scaleSuffix = scale === 2 ? "_x2" : "";
  return `${BUTTON_ASSET_KEYS[variant]}_${state}${scaleSuffix}.png`;
}

export function buttonAssetPath(
  variant: ButtonVariant,
  state: ButtonState,
  scale: ButtonScale,
): string {
  return `/ui/m5_1/${buttonAssetFile(variant, state, scale)}`;
}

export const BUTTON_ASSET_FILES: readonly string[] = BUTTON_SKIN_VARIANTS.flatMap((variant) =>
  BUTTON_STATES.flatMap((state) => BUTTON_SCALES.map((scale) => buttonAssetFile(variant, state, scale))),
);

export function buttonMetrics(scale: ButtonScale = BUTTON_UI_SCALE) {
  return {
    slicePx: BUTTON_SLICE.slice * scale,
    /** CSS pixels the label drops. Equals the face shift at this scale. */
    pressPx: BUTTON_PRESS_FACE_SHIFT_PX * scale,
    iconPx: BUTTON_SLICE.size[0] * scale,
    minHeightPx: BUTTON_SLICE.size[1] * scale,
  };
}

/** Inline custom properties for one button. The box itself does not translate. */
export function pixelButtonStyle(
  variant: ButtonVariant,
  scale: ButtonScale = BUTTON_UI_SCALE,
): Record<`--${string}`, string> {
  const metrics = buttonMetrics(scale);
  const light = variant === "light";
  return {
    "--btn-slice": `${metrics.slicePx} fill`,
    "--btn-slice-width": `${metrics.slicePx}px`,
    "--btn-press": `${metrics.pressPx}px`,
    "--btn-min-height": `${metrics.minHeightPx}px`,
    "--btn-icon-size": `${metrics.iconPx}px`,
    "--btn-pad-x": `${BUTTON_PAD_X_PX}px`,
    "--btn-gap": `${BUTTON_GAP_PX}px`,
    "--btn-focus": `${BUTTON_FOCUS_PX}px`,
    "--btn-ink": BUTTON_INK[variant],
    "--btn-weight": `${light ? BUTTON_LIGHT.weight : 400}`,
    "--btn-bg": light ? BUTTON_LIGHT.background : "transparent",
    "--btn-border": light ? BUTTON_LIGHT.border : "transparent",
    "--btn-label-size": light ? `${BUTTON_LIGHT.labelPx}px` : "var(--text-galmuri-title)",
    "--btn-img": `url("${buttonAssetPath(variant, "normal", scale)}")`,
    "--btn-img-hover": `url("${buttonAssetPath(variant, "hover", scale)}")`,
    "--btn-img-pressed": `url("${buttonAssetPath(variant, "pressed", scale)}")`,
  };
}
