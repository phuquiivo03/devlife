/**
 * Food grid layout configuration. Documented in docs/design/DESIGN_SYSTEM.md (Food grid).
 * Smaller card size than Store grid for quicker food selection.
 */

export const FOOD_GRID = {
  /** Columns below desktopMinPx */
  columnsMobile: 2,
  /** Columns from desktopMinPx up */
  columnsDesktop: 3,
  /** Viewport width where grid switches to columnsDesktop */
  desktopMinPx: 1024,
  /** Space between cells, CSS pixels */
  gapPx: 8,
  /** Food card cell width */
  cellPx: 120,
  /** Panel padding on both sides */
  modalPadPx: 24,
  /** Dialog max width */
  modalMaxPx: 400,
  /** Food icon display size */
  foodIconPx: 64,
} as const;

export function foodModalMaxPx(grid = FOOD_GRID): number {
  const gaps = grid.gapPx * (grid.columnsDesktop - 1);
  return grid.cellPx * grid.columnsDesktop + gaps + grid.modalPadPx;
}

/** Column rules for [data-food-grid] */
export function foodGridCss(grid = FOOD_GRID): string {
  return [
    `[data-food-grid]{display:grid;grid-template-columns:repeat(${grid.columnsMobile},minmax(0,1fr));gap:${grid.gapPx}px;}`,
    `@media (min-width:${grid.desktopMinPx}px){[data-food-grid]{grid-template-columns:repeat(${grid.columnsDesktop},minmax(0,1fr));}}`,
  ].join("");
}
