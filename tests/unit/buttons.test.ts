import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import {
  BUTTON_ASSET_FILES,
  BUTTON_ASSET_KEYS,
  BUTTON_LIGHT,
  BUTTON_PRESS_FACE_SHIFT_PX,
  BUTTON_SCALES,
  BUTTON_SKIN_VARIANTS,
  BUTTON_STATES,
  BUTTON_UI_SCALE,
  BUTTON_VARIANTS,
  buttonAssetFile,
  buttonAssetPath,
  buttonMetrics,
  pixelButtonStyle,
} from "@/components/ui/button/config";
import { m51AssetPath } from "@/game/life/assets";
import sliceDoc from "../../public/ui/m5_1/slices.json";

function readPng(file: string): PNG {
  return PNG.sync.read(readFileSync(join(process.cwd(), "public/ui/m5_1", file)));
}

function rowTransparent(png: PNG, y: number): boolean {
  for (let x = 0; x < png.width; x += 1) {
    if (png.data[(y * png.width + x) * 4 + 3] !== 0) return false;
  }
  return true;
}

describe("pixel button assets", () => {
  it("reads the 9-slice and the 2px face shift from slices.json", () => {
    expect(sliceDoc["ui_btn_*"].slice).toBe(8);
    expect(sliceDoc["ui_btn_*"].size).toEqual([24, 24]);
    expect(sliceDoc["ui_btn_*"].note).toContain("offset label");
    expect(BUTTON_PRESS_FACE_SHIFT_PX).toBe(2);
  });

  it("ships native and _x2 skins for every skinned variant and state", () => {
    expect(BUTTON_ASSET_FILES).toHaveLength(24);
    expect(BUTTON_VARIANTS).toContain("light");
    for (const variant of BUTTON_SKIN_VARIANTS) {
      expect(BUTTON_ASSET_KEYS[variant]).toBe(`ui_btn_${variant}`);
      for (const state of BUTTON_STATES) {
        for (const scale of BUTTON_SCALES) {
          const file = buttonAssetFile(variant, state, scale);
          expect(buttonAssetPath(variant, state, scale)).toBe(m51AssetPath(file));
          expect(existsSync(join(process.cwd(), "public/ui/m5_1", file))).toBe(true);
          const png = readPng(file);
          expect(png.width).toBe(24 * scale);
          expect(png.height).toBe(24 * scale);
        }
      }
    }
  });

  it("draws the pressed face 2 native pixels lower", () => {
    for (const variant of BUTTON_SKIN_VARIANTS) {
      const normal = readPng(buttonAssetFile(variant, "normal", 1));
      const pressed = readPng(buttonAssetFile(variant, "pressed", 1));
      const pressedX2 = readPng(buttonAssetFile(variant, "pressed", 2));
      expect(rowTransparent(normal, 0)).toBe(false);
      for (let y = 0; y < BUTTON_PRESS_FACE_SHIFT_PX; y += 1) {
        expect(rowTransparent(pressed, y)).toBe(true);
      }
      for (let y = 0; y < BUTTON_PRESS_FACE_SHIFT_PX * 2; y += 1) {
        expect(rowTransparent(pressedX2, y)).toBe(true);
      }
    }
  });
});

describe("pixel button chrome", () => {
  it("scales the slice and the label shift together", () => {
    expect(buttonMetrics(1)).toMatchObject({ slicePx: 8, pressPx: 2, iconPx: 24, minHeightPx: 24 });
    expect(buttonMetrics(BUTTON_UI_SCALE)).toMatchObject({
      slicePx: 16,
      pressPx: 4,
      iconPx: 48,
      minHeightPx: 48,
    });
  });

  it("points each variant at its own normal, hover, and pressed sheets", () => {
    const style = pixelButtonStyle("danger");
    expect(style["--btn-slice"]).toBe("16 fill");
    expect(style["--btn-press"]).toBe("4px");
    expect(style["--btn-img"]).toBe('url("/ui/m5_1/ui_btn_danger_normal_x2.png")');
    expect(style["--btn-img-hover"]).toBe('url("/ui/m5_1/ui_btn_danger_hover_x2.png")');
    expect(style["--btn-img-pressed"]).toBe('url("/ui/m5_1/ui_btn_danger_pressed_x2.png")');
    expect(style["--btn-ink"]).toBe("#FFFFFF");
    expect(pixelButtonStyle("secondary")["--btn-ink"]).toBe(BUTTON_LIGHT.ink);
  });

  it("paints light with the notice face and the shared tokens", () => {
    expect(BUTTON_ASSET_KEYS.light).toBe(BUTTON_ASSET_KEYS.secondary);
    expect(BUTTON_LIGHT).toMatchObject({
      background: "#E8E2F4",
      border: "#1E1428",
      ink: "#2A2548",
      weight: 400,
      labelPx: 16,
      iconPx: 22,
    });
    const light = pixelButtonStyle("light");
    const secondary = pixelButtonStyle("secondary");
    expect(light["--btn-img"]).toBe(secondary["--btn-img"]);
    expect(light["--btn-img-hover"]).toBe(secondary["--btn-img-hover"]);
    expect(light["--btn-img-pressed"]).toBe(secondary["--btn-img-pressed"]);
    expect(light["--btn-ink"]).toBe(BUTTON_LIGHT.ink);
    expect(light["--btn-bg"]).toBe(BUTTON_LIGHT.background);
    expect(light["--btn-border"]).toBe(BUTTON_LIGHT.border);
    expect(light["--btn-weight"]).toBe(String(BUTTON_LIGHT.weight));
    expect(light["--btn-label-size"]).toBe(`${BUTTON_LIGHT.labelPx}px`);
    const css = readFileSync(
      join(process.cwd(), "src/components/ui/button/pixel-button.module.css"),
      "utf8",
    );
    const theme = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain("var(--btn-bg, var(--btn-light-bg))");
    expect(css).toContain("var(--btn-border, var(--btn-light-border))");
    expect(css).toContain("var(--btn-label-size, var(--btn-light-label))");
    expect(theme).toContain(`--btn-light-bg: ${BUTTON_LIGHT.background.toLowerCase()}`);
    expect(theme).toContain(`--btn-light-border: ${BUTTON_LIGHT.border.toLowerCase()}`);
    expect(theme).toContain(`--btn-light-ink: ${BUTTON_LIGHT.ink.toLowerCase()}`);
    expect(theme).toContain(`--btn-light-label: ${BUTTON_LIGHT.labelPx}px`);
    expect(theme).toContain(`--btn-light-weight: ${BUTTON_LIGHT.weight}`);
  });

  it("uses the light face for the menu, Đã đọc, life choices, and Làm", () => {
    const hud = readFileSync(join(process.cwd(), "src/components/game/PlayerHudCard.tsx"), "utf8");
    const notices = readFileSync(join(process.cwd(), "src/components/game/NotificationsPanel.tsx"), "utf8");
    const popup = readFileSync(join(process.cwd(), "src/components/game/LifeEventPopup.tsx"), "utf8");
    const board = readFileSync(join(process.cwd(), "src/components/game/career/JobManageBoard.tsx"), "utf8");
    expect(hud).toContain('variant="light"');
    expect(hud).toContain('icon: "learn_book"');
    expect(hud).toContain('icon: "job"');
    expect(hud).toContain("SKILL_MENU_ICON");
    expect(hud).toContain("BUTTON_LIGHT.iconPx");
    expect(hud).not.toMatch(/hud-action(?!s)/);
    expect(notices).toContain('variant="light"');
    expect(notices).toContain("Đã đọc");
    expect(notices).toContain('variant="secondary"');
    expect(popup).toContain('variant="light"');
    expect(popup).toContain("chooseLife");
    expect(board).toContain('variant="light"');
    expect(board).toContain("Làm");
  });

  it("drops the label with the face and does not translate the button box", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/ui/button/pixel-button.module.css"),
      "utf8",
    );
    expect(css).toContain(".pixelButton:active:not(:disabled) > *");
    expect(css).toContain("transform: translateY(var(--btn-press))");
    expect(css).not.toMatch(/\.pixelButton:active:not\(:disabled\)\s*\{[^}]*transform:/);
  });
});
