/**
 * Store dialog grid. Documented in docs/design/DESIGN_SYSTEM.md (Store grid).
 * Column counts are injected by `storeGridCss()` so the stylesheet does not
 * keep a second copy of these numbers.
 *
 * `desktopMinPx` is Tailwind `lg`, the same cutoff as the shell.
 * Below it the dialog uses the mobile column count.
 */

export const STORE_GRID = {
  /** Columns below `desktopMinPx`. */
  columnsMobile: 2,
  /** Columns from `desktopMinPx` up. */
  columnsDesktop: 4,
  /** Viewport width where the grid switches to `columnsDesktop`. */
  desktopMinPx: 1024,
  /** Space between cells, CSS pixels. */
  gapPx: 8,
  /**
   * Desktop cell width the dialog is sized for. Narrower than the old
   * 192px store card.
   */
  cellPx: 148,
  /** Panel padding on both sides. Matches the modal `PanelCard` `p-3` (12px). */
  modalPadPx: 24,
  /** Dialog cap: `cellPx * columnsDesktop + gapPx * (columnsDesktop - 1) + modalPadPx`. */
  modalMaxPx: 640,
  /** Furniture sheet is 32px native, drawn at 2×. */
  furnitureIconPx: 64,
  /** Room sheet is 64×40 native, drawn at 1× so it fits the smaller cell. */
  roomIconW: 64,
  roomIconH: 40,
  /** Owned check and lock. Half of the 44px icon, an integer scale. */
  badgePx: 22,
} as const;

export function storeModalMaxPx(grid = STORE_GRID): number {
  const gaps = grid.gapPx * (grid.columnsDesktop - 1);
  return grid.cellPx * grid.columnsDesktop + gaps + grid.modalPadPx;
}

export function storeIconSize(icon: string, grid = STORE_GRID): { w: number; h: number } {
  if (icon.startsWith("icon_store_room_")) return { w: grid.roomIconW, h: grid.roomIconH };
  return { w: grid.furnitureIconPx, h: grid.furnitureIconPx };
}

/** Column rules for `[data-store-grid]`. Numbers come from `STORE_GRID`. */
export function storeGridCss(grid = STORE_GRID): string {
  return [
    `[data-store-grid]{display:grid;grid-template-columns:repeat(${grid.columnsMobile},minmax(0,1fr));gap:${grid.gapPx}px;}`,
    `@media (min-width:${grid.desktopMinPx}px){[data-store-grid]{grid-template-columns:repeat(${grid.columnsDesktop},minmax(0,1fr));}}`,
  ].join("");
}
