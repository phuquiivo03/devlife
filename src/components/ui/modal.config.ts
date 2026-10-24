/**
 * Popup modal shell. Documented in docs/design/DESIGN_SYSTEM.md (Modal).
 * The z-index matches the overlays already on screen: backdrop with the
 * career panel, food popup, and sheet overlay; dialog with sheet content
 * and the level-up popup.
 */

export const MODAL = {
  /** Dim layer. Same stack as the career panel, food popup, and sheet overlay. */
  overlayZ: 40,
  /** Dialog layer. Same stack as sheet content and the level-up popup. */
  contentZ: 50,
  /** Fade and rise. `prefers-reduced-motion` skips it. */
  enterMs: 160,
  /** How far the dialog rises while it fades in, CSS pixels. */
  risePx: 4,
  /** Dim tint shared with the other full-screen overlays. */
  backdrop: "rgba(42, 37, 72, 0.28)",
  /** Dialog height cap, as a percentage of the viewport. */
  maxHeightVh: 80,
  /**
   * Title row, gap, and panel padding reserved under that cap, CSS pixels.
   * The body scrolls inside the space that remains.
   */
  chromePx: 112,
  /** Default width cap. A caller can pass a narrower one. */
  maxWidthPx: 420,
  /** Side inset so the dialog stays off the viewport edge. */
  viewportInsetPx: 16,
} as const;

export function modalOverlayStyle(): {
  zIndex: number;
  backgroundColor: string;
  animationDuration: string;
} {
  return {
    zIndex: MODAL.overlayZ,
    backgroundColor: MODAL.backdrop,
    animationDuration: `${MODAL.enterMs}ms`,
  };
}

export function modalContentStyle(maxWidthPx: number = MODAL.maxWidthPx): {
  zIndex: number;
  animationDuration: string;
  maxHeight: string;
  width: string;
  "--modal-rise": string;
} {
  const inset = MODAL.viewportInsetPx * 2;
  return {
    zIndex: MODAL.contentZ,
    animationDuration: `${MODAL.enterMs}ms`,
    maxHeight: `${MODAL.maxHeightVh}vh`,
    width: `min(calc(100vw - ${inset}px), ${maxWidthPx}px)`,
    "--modal-rise": `${MODAL.risePx}px`,
  };
}
