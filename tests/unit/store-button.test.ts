import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { BUTTON_UI_SCALE, buttonMetrics } from "@/components/ui/button/config";
import {
  HUD_ICON_GAP_PX,
  STORE_ICON_NATIVE_PX,
  STORE_LABEL,
  STORE_MODAL_MAX_PX,
  storeButtonMetrics,
  storeIconFile,
} from "@/components/game/store-button.config";
import sliceDoc from "../../public/ui/m5_1/slices.json";

const SHARED_SLICE_KEYS = [
  "ui_window_notepad",
  "ui_btn_*",
  "ui_banner_v2",
  "ui_badge_unread_lg",
  "icon_hunger_*",
] as const;

function readPng(file: string): PNG {
  return PNG.sync.read(readFileSync(join(process.cwd(), "public/ui/m5_1", file)));
}

describe("store button art", () => {
  it("leaves every shared slices.json key in place", () => {
    for (const key of SHARED_SLICE_KEYS) {
      expect(sliceDoc).toHaveProperty(key);
    }
    expect(sliceDoc["ui_btn_*"].slice).toBe(8);
  });

  it("ships the shop icon at native and 2×", () => {
    for (const scale of [1, 2] as const) {
      const file = storeIconFile(scale);
      const icon = readPng(file);
      expect(existsSync(join(process.cwd(), "public/ui/m5_1", file))).toBe(true);
      expect(icon.width).toBe(STORE_ICON_NATIVE_PX * scale);
      expect(icon.height).toBe(STORE_ICON_NATIVE_PX * scale);
    }
  });
});

describe("store button metrics", () => {
  it("fits the 2× shop icon inside the icon button face", () => {
    const metrics = storeButtonMetrics();
    const border = buttonMetrics(BUTTON_UI_SCALE).slicePx;
    expect(metrics.iconPx).toBe(48);
    expect(metrics.buttonPx).toBe(metrics.iconPx + border * 2);
    expect(STORE_LABEL).toBe("Cửa hàng");
    expect(HUD_ICON_GAP_PX).toBe(8);
    expect(STORE_MODAL_MAX_PX).toBe(640);
  });

  it("puts the shop icon on the room status bar and keeps sleep on the HUD", () => {
    const hud = readFileSync(join(process.cwd(), "src/components/game/PlayerHudCard.tsx"), "utf8");
    const shell = readFileSync(join(process.cwd(), "src/components/game/GameShell.tsx"), "utf8");
    const button = readFileSync(join(process.cwd(), "src/components/game/StoreButton.tsx"), "utf8");
    const notices = readFileSync(join(process.cwd(), "src/components/game/NotificationsPanel.tsx"), "utf8");
    const statusAt = hud.indexOf('data-testid="room-status-bar"');
    const iconBarAt = hud.indexOf('data-testid="hud-icon-bar"');
    expect(statusAt).toBeGreaterThan(-1);
    expect(iconBarAt).toBeGreaterThan(statusAt);
    expect(hud.indexOf("<StoreButton")).toBeGreaterThan(statusAt);
    expect(hud.indexOf("<StoreButton")).toBeLessThan(iconBarAt);
    expect(hud.indexOf('data-testid="hud-money"')).toBeLessThan(iconBarAt);
    expect(hud.indexOf('data-testid="game-clock"')).toBeLessThan(iconBarAt);
    expect(hud.split("<StoreButton").length - 1).toBe(1);
    expect(hud.split('data-testid="hud-money"').length - 1).toBe(1);
    expect(hud.split('data-testid="game-clock"').length - 1).toBe(1);
    expect(hud.indexOf("<SleepButton")).toBeGreaterThan(iconBarAt);
    expect(shell.indexOf("<RoomStatusBar")).toBeGreaterThan(-1);
    expect(shell.indexOf("<RoomStatusBar")).toBeLessThan(shell.indexOf("<RoomChamferFrame"));
    expect(button).toContain('variant="icon"');
    expect(button).toContain('data-icon-key="icon_btn_store"');
    expect(button).toContain("aria-label={STORE_LABEL}");
    expect(button).toContain("TooltipContent");
    expect(button).not.toContain("title=");
    expect(notices).not.toContain("StorePanel");
    expect(notices).not.toContain("storeOpen");
  });
});
