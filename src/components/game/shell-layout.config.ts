/**
 * Desktop side panels and the room status bar.
 * Documented in docs/design/DESIGN_SYSTEM.md (Layout, Room status bar).
 * Below `desktopMinPx` the columns stay in normal flow and scroll with the page.
 * The status bar lives in the scrolling center column on every width, so it
 * does not change the sticky cap (`headerPx`, `marginYPx`, `stickyTopPx`).
 */

/** CSS cap for the room slot. Do not grow it to fill the column. */
export const ROOM_VIEWPORT_W = 480;

/**
 * Center column cap from the design system. The HUD card and the room
 * status bar share it. The room slot stays at `ROOM_VIEWPORT_W`.
 */
export const CENTER_COLUMN_MAX_PX = 520;

export const SHELL_LAYOUT = {
  /**
   * Tailwind `lg`. The CSS module media query uses this same pixel value.
   * Narrower viewports keep the room → HUD → panels stack.
   */
  desktopMinPx: 1024,
  /** Header block. Matches `min-h-14` on the shell header (border included). */
  headerPx: 56,
  /**
   * Top and bottom inset. Matches `lg:py-6` on the scrolling region.
   * Sticky `top` stays 0: that padding is already the inset, and a second
   * offset would stack on it.
   */
  marginYPx: 24,
  stickyTopPx: 0,
  /**
   * Panel stack. The holiday banner is `z-30`, and modal backdrops,
   * popups, and tooltips start at 40. Panels stay under that floor so a
   * banner can paint across them.
   */
  panelZ: 1,
  /** Lowest overlay the panels must stay under. The banner uses this. */
  overlayFloorZ: 30,
} as const;

/** `100vh` minus the header and both vertical margins. */
export function shellPanelMaxHeight(layout = SHELL_LAYOUT): string {
  const reserved = layout.headerPx + layout.marginYPx * 2;
  return `calc(100vh - ${reserved}px)`;
}

/**
 * Custom properties consumed by `shell-layout.module.css` at the desktop breakpoint.
 * `panelHeightPx` is the measured height of the center room card; the side panels
 * match it so their tops and bottoms align with the card. Without it the panels
 * fall back to the viewport cap, and the cap still bounds them either way.
 */
export function shellPanelVars(
  layout = SHELL_LAYOUT,
  panelHeightPx?: number,
): Record<`--${string}`, string> {
  return {
    "--shell-panel-top": `${layout.stickyTopPx}px`,
    "--shell-panel-max": shellPanelMaxHeight(layout),
    ...(panelHeightPx ? { "--shell-panel-h": `${panelHeightPx}px` } : {}),
    "--shell-panel-z": String(layout.panelZ),
  };
}

/**
 * Bar directly above the room canvas: Tiền, Ngày/giờ, and Cửa hàng.
 * Width follows the center column so Tiền, the clock, and the shop button
 * stay on one line there. The shop button pins to the trailing edge.
 */
export const ROOM_STATUS_BAR = {
  /** Same cap as the center column and the HUD card. */
  maxWidthPx: CENTER_COLUMN_MAX_PX,
  /** Space between this bar and the room frame. */
  gapBelowPx: 8,
  padXPx: 12,
  padYPx: 6,
  /** Space between the money cluster and the clock cluster. */
  clusterGapPx: 16,
  /** Space between an icon and its text. */
  iconGapPx: 6,
  /** Row gap when money, clock, and the shop button wrap. */
  wrapGapPx: 8,
  /** Savings icon and the phase icon. Integer scale of the 44px sheet. */
  iconPx: 22,
  /**
   * Between day, weekday, and clock. The phase name follows the clock
   * with a single space: `Ngày 1 · T2 · 08:12 Sáng`.
   */
  separator: " · ",
} as const;

export function roomStatusClockLabel(
  day: number,
  weekdayLabel: string,
  clockLabel: string,
  phaseLabel: string,
): string {
  const sep = ROOM_STATUS_BAR.separator;
  return `Ngày ${day}${sep}${weekdayLabel}${sep}${clockLabel} ${phaseLabel}`;
}

/** Custom properties for `.statusBar` in `shell-layout.module.css`. */
export function roomStatusBarVars(bar = ROOM_STATUS_BAR): Record<`--${string}`, string> {
  return {
    "--room-status-max": `${bar.maxWidthPx}px`,
    "--room-status-gap": `${bar.gapBelowPx}px`,
    "--room-status-pad-x": `${bar.padXPx}px`,
    "--room-status-pad-y": `${bar.padYPx}px`,
    "--room-status-cluster": `${bar.clusterGapPx}px`,
    "--room-status-icon-gap": `${bar.iconGapPx}px`,
    "--room-status-wrap": `${bar.wrapGapPx}px`,
  };
}
