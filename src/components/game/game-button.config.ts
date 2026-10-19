import { LIFE } from "@/game/life/content";
import { energyCost } from "@/game/life/logic";
import { sleepButtonMetrics } from "./sleep-button.config";

export const GAME_LABEL = LIFE.game_label; // "Chơi game"
/** Placeholder face until Art ships icon_btn_game.png (24×24) and icon_btn_game_x2.png (48×48) in public/ui/m5_1/. */
export const GAME_ICON_FALLBACK = "🎮";
export const GAME_ICON_KEY = "icon_btn_game";

/** Same outer box as Đi ngủ and Ăn. */
export function gameButtonMetrics() {
  const m = sleepButtonMetrics();
  return { iconPx: m.iconPx, buttonPx: m.buttonPx };
}

/** Tooltip: the block reason, or "Chơi game · 2 giờ · Tinh thần ~+8 · Năng lượng −5". "~" because the result is rolled. */
export function gameButtonTip(reason: string | null, moodGain: number, energyCostVal: number, hours: number): string {
  if (reason) return reason;
  return `${GAME_LABEL} · ${hours} giờ · Tinh thần ~+${Math.round(moodGain)} · Năng lượng −${Math.ceil(energyCostVal)}`;
}

/** Compute the energy cost display for tooltip, considering work streak. */
export function gameEnergyDisplay(workStreak: number): number {
  return energyCost(LIFE.game_energy, workStreak);
}
