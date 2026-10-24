import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LIFE } from "@/game/life/content";
import { sleepButtonMetrics } from "@/components/game/sleep-button.config";
import {
  FOOD_TIP_ACTION,
  foodButtonMetrics,
  foodDockTip,
  foodDotVisible,
  foodEatBlockReason,
} from "@/components/game/food-dock.config";

describe("food dock fullness gate", () => {
  it("blocks at or above fullness_eat_below with the configured reason", () => {
    expect(foodEatBlockReason(100)).toBe(LIFE.fullness_eat_block);
    expect(foodEatBlockReason(LIFE.fullness_eat_below)).toBe(LIFE.fullness_eat_block);
    expect(foodEatBlockReason(LIFE.fullness_eat_below - 0.5)).toBeNull();
    expect(foodEatBlockReason(0)).toBeNull();
  });

  it("shows the amber dot only while a meal is available", () => {
    expect(foodDotVisible(100)).toBe(false);
    expect(foodDotVisible(LIFE.fullness_eat_below)).toBe(false);
    expect(foodDotVisible(LIFE.fullness_eat_below - 0.5)).toBe(true);
    expect(foodDotVisible(0)).toBe(true);
  });

  it("tooltip is the block reason when blocked, else the plain action", () => {
    expect(foodDockTip(null)).toBe(FOOD_TIP_ACTION);
    expect(foodDockTip(LIFE.fullness_eat_block)).toBe(LIFE.fullness_eat_block);
  });
});

describe("food dock metrics and placement", () => {
  it("matches the sleep icon button and sits immediately before it on the HUD bar", () => {
    for (const scale of [1, 2] as const) {
      expect(foodButtonMetrics(scale)).toEqual({
        scale,
        iconPx: sleepButtonMetrics(scale).iconPx,
        buttonPx: sleepButtonMetrics(scale).buttonPx,
      });
    }
    const dock = readFileSync(join(process.cwd(), "src/components/game/FoodPopup.tsx"), "utf8");
    const hud = readFileSync(join(process.cwd(), "src/components/game/PlayerHudCard.tsx"), "utf8");
    const life = readFileSync(join(process.cwd(), "src/components/game/LifeStage.tsx"), "utf8");
    expect(dock).toContain('variant="icon"');
    expect(dock).toContain("foodButtonMetrics");
    expect(dock).toContain("aria-label={tip}");
    expect(dock).toContain('data-testid="food-open"');
    expect(dock).toContain("foodEatBlockReason");
    expect(dock).toContain("styles.readyDot");
    expect(dock).toContain("setFoodOpen");
    const barAt = hud.indexOf('data-testid="hud-icon-bar"');
    const eatAt = hud.indexOf("<HungerDock");
    const sleepAt = hud.indexOf("<SleepButton");
    expect(barAt).toBeGreaterThan(-1);
    expect(eatAt).toBeGreaterThan(barAt);
    expect(sleepAt).toBeGreaterThan(eatAt);
    expect(hud).toContain("flex-wrap");
    expect(hud).toContain("justify-end");
    expect(life).not.toContain("HungerDock");
  });

  it("renders the dot from the shared amber accent and keeps no pulse animation", () => {
    const css = readFileSync(join(process.cwd(), "src/components/game/food-dock.module.css"), "utf8");
    expect(css).toContain("var(--accent-amber)");
    expect(css).not.toContain("bowlBlink");
    expect(css).not.toContain("animation");
    expect(css).not.toMatch(/transform\s*:/);
    const globals = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(globals).toContain("--accent-amber");
    expect(globals).not.toContain("hunger-blink");
    expect(globals).toContain(".ui-tooltip");
  });
});
