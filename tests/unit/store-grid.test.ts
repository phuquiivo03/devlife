import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SHELL_LAYOUT } from "@/components/game/shell-layout.config";
import { STORE_MODAL_MAX_PX } from "@/components/game/store-button.config";
import {
  STORE_GRID,
  storeGridCss,
  storeIconSize,
  storeModalMaxPx,
} from "@/components/game/store-grid.config";
import {
  filterStoreItems,
  STORE_TABS,
  storeCardAction,
  storeShelf,
} from "@/components/game/store-shelf";
import { STORE_ITEMS } from "@/game/life/furniture";
import storeConfig from "../../config/store.json";

describe("store shelves", () => {
  it("derives rooms and furniture from the stage/prefix, not the category", () => {
    // store.json rows may carry a `category` (slot placement) — room rows
    // never do, and the shelf split still only looks at id/stage.
    for (const item of storeConfig.items) {
      if (item.stage != null) expect(item.category).toBeUndefined();
    }
    expect(storeShelf({ id: "bed_vip" })).toBe("furniture");
    expect(STORE_ITEMS.map((item) => [item.id, storeShelf(item)])).toEqual([
      ["room_junior", "room"],
      ["room_senior", "room"],
      ["aircon", "furniture"],
      ["ergo_chair", "furniture"],
      ["monitor2", "furniture"],
      ["mattress", "furniture"],
      ["plant_big", "furniture"],
      ["fan_standing", "furniture"],
      ["plant_small", "furniture"],
      ["bed_vip", "furniture"],
      ["bed_floor_mat", "furniture"],
      ["fairy_lights", "furniture"],
      ["lamp_desk", "furniture"],
      ["poster_vn", "furniture"],
      ["books_stack", "furniture"],
      ["kettle", "furniture"],
      ["mug", "furniture"],
      ["nightstand", "furniture"],
      ["stool_plastic", "furniture"],
      ["keyboard", "furniture"],
    ]);
    expect(storeShelf({ id: "room_custom" })).toBe("room");
    expect(storeShelf({ id: "lamp", stage: "junior" })).toBe("room");
    expect(storeShelf({ id: "lamp" })).toBe("furniture");
  });

  it("filters the three tabs and draws furniture before rooms", () => {
    expect(STORE_TABS.map((tab) => tab.label)).toEqual(["Nội thất", "Phòng", "Tất cả"]);
    expect(filterStoreItems(STORE_ITEMS, "furniture").map((item) => item.id)).toEqual([
      "aircon",
      "ergo_chair",
      "monitor2",
      "mattress",
      "plant_big",
      "fan_standing",
      "plant_small",
      "bed_vip",
      "bed_floor_mat",
      "fairy_lights",
      "lamp_desk",
      "poster_vn",
      "books_stack",
      "kettle",
      "mug",
      "nightstand",
      "stool_plastic",
      "keyboard",
    ]);
    expect(filterStoreItems(STORE_ITEMS, "room").map((item) => item.id)).toEqual([
      "room_junior",
      "room_senior",
    ]);
    expect(filterStoreItems(STORE_ITEMS, "all").map((item) => item.id)).toEqual([
      "aircon",
      "ergo_chair",
      "monitor2",
      "mattress",
      "plant_big",
      "fan_standing",
      "plant_small",
      "bed_vip",
      "bed_floor_mat",
      "fairy_lights",
      "lamp_desk",
      "poster_vn",
      "books_stack",
      "kettle",
      "mug",
      "nightstand",
      "stool_plastic",
      "keyboard",
      "room_junior",
      "room_senior",
    ]);
  });

  it("keeps buy and pin on the card that can use them", () => {
    expect(storeCardAction({ owned: true, locked: false, canBuy: false })).toEqual({
      buy: "owned",
      pin: false,
    });
    expect(storeCardAction({ owned: false, locked: true, canBuy: false })).toEqual({
      buy: "hidden",
      pin: true,
    });
    expect(storeCardAction({ owned: false, locked: false, canBuy: false })).toEqual({
      buy: "buy",
      pin: true,
    });
    expect(storeCardAction({ owned: false, locked: false, canBuy: true })).toEqual({
      buy: "buy",
      pin: false,
    });
  });
});

describe("store grid config", () => {
  it("uses 4 desktop columns and 2 mobile columns at the shell breakpoint", () => {
    expect(STORE_GRID.columnsDesktop).toBe(4);
    expect(STORE_GRID.columnsMobile).toBe(2);
    expect(STORE_GRID.desktopMinPx).toBe(1024);
    expect(STORE_GRID.desktopMinPx).toBe(SHELL_LAYOUT.desktopMinPx);
    expect(storeModalMaxPx()).toBe(640);
    expect(STORE_GRID.modalMaxPx).toBe(storeModalMaxPx());
    expect(STORE_MODAL_MAX_PX).toBe(STORE_GRID.modalMaxPx);
    expect(storeGridCss()).toBe(
      "[data-store-grid]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}@media (min-width:1024px){[data-store-grid]{grid-template-columns:repeat(4,minmax(0,1fr));}}",
    );
  });

  it("draws furniture at 2× and rooms at 1×", () => {
    expect(storeIconSize("shop_aircon.png")).toEqual({ w: 64, h: 64 });
    expect(storeIconSize("icon_store_room_junior.png")).toEqual({ w: 64, h: 40 });
    expect(STORE_GRID.badgePx).toBe(22);
  });

  it("renders the grid inside the shared modal with pixel buttons and a tablist", () => {
    const panel = readFileSync(join(process.cwd(), "src/components/game/StorePanel.tsx"), "utf8");
    const modal = readFileSync(join(process.cwd(), "src/components/game/StoreModal.tsx"), "utf8");
    expect(panel).toContain('import { PixelButton } from "@/components/ui/button"');
    expect(panel).not.toMatch(/import\s*\{[^}]*\bButton\b/);
    expect(panel).toContain("Đã có");
    expect(panel).toContain("Ghim");
    expect(panel).toContain("data-store-grid");
    expect(panel).toContain("storeGridCss()");
    expect(panel).toContain("TabsList");
    expect(panel).toContain('aria-label="Danh mục cửa hàng"');
    expect(modal).toContain("<Modal");
    expect(modal).toContain("STORE_GRID.modalMaxPx");
    expect(modal).toContain("<StorePanel");
  });
});
