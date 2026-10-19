import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sleepButtonMetrics } from "@/components/game/sleep-button.config";
import { gameButtonMetrics, gameButtonTip, GAME_LABEL } from "@/components/game/game-button.config";

describe("GameButton", () => {
  it("metrics match sleep", () => {
    const g = gameButtonMetrics();
    const s = sleepButtonMetrics();
    expect(g.iconPx).toBe(s.iconPx);
    expect(g.buttonPx).toBe(s.buttonPx);
  });

  it("tooltip text", () => {
    const tip = gameButtonTip(null, 8, 5, 2);
    expect(tip).toBe("Chơi game · 2 giờ · Tinh thần ~+8 · Năng lượng −5");
    expect(gameButtonTip("Đang làm job", 8, 5, 2)).toBe("Đang làm job");
    expect(gameButtonTip(null, 4, 5, 2)).toBe("Chơi game · 2 giờ · Tinh thần ~+4 · Năng lượng −5");
  });

  it("source contains expected elements", () => {
    const src = readFileSync(join(process.cwd(), "src/components/game/GameButton.tsx"), "utf8");
    expect(src).toContain("TooltipContent");
    expect(src).toContain("aria-label={GAME_LABEL}");
    expect(src).toContain('variant="icon"');
    expect(src).toContain("playGame");
    expect(src).toContain("gameBlocked");
    expect(src).not.toContain("title=");
  });

  it("PlayerHudCard order", () => {
    const src = readFileSync(join(process.cwd(), "src/components/game/PlayerHudCard.tsx"), "utf8");
    const hunger = src.indexOf("<HungerDock");
    const game = src.indexOf("<GameButton");
    const sleep = src.indexOf("<SleepButton");
    expect(hunger).toBeGreaterThan(-1);
    expect(game).toBeGreaterThan(-1);
    expect(sleep).toBeGreaterThan(-1);
    expect(hunger).toBeLessThan(game);
    expect(game).toBeLessThan(sleep);
  });
});
