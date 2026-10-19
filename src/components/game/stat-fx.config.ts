/** Stat FX timings and look. Approved demo: devlife-specs/stat_fx_demo.html. */
export const STAT_FX = {
  /** Changes inside this window merge into one floater per stat (same as the old HUD). */
  aggregateMs: 40,
  floatMs: 800,
  floatRisePx: 24,
  floatStaggerMs: 120,
  /** Oldest floater of a stat is dropped beyond this. */
  floatMaxPerStat: 3,
  floatEasing: "ease-out",
  tweenMs: 500,
  tweenBigMs: 600,
  flashMs: 450,
  /** |Δmoney| ≥ this → big pill (+ shake in the clock/shake PR). */
  bigMoneyVnd: 1_000_000,
  shakeMs: 280,
  shakePx: 3,
  clockFfMs: 600,
  clockSleepMs: 1200,
  /** Store jumps smaller than this tick normally (×60 moves ~2.4 min per frame). */
  clockFfMinMinutes: 30,
  /** Jumps up to this use clockFfMs, longer ones (sleep, hospital) clockSleepMs. */
  clockFfShortMaxMinutes: 240,
  phaseXfadeMs: 400,
  colors: {
    gainFill: "var(--accent-mint)",
    lossFill: "var(--accent-coral)",
    timeFill: "var(--muted)",
    ink: "var(--foreground)",
    timeInk: "var(--accent-violet)",
    border: "#1e1428",              // BUTTON_LIGHT pixel border ink
    gainFlash: "rgba(92, 203, 154, 0.35)",
    lossFlash: "rgba(240, 98, 95, 0.35)",
  },
  labels: {
    salary: "Lương",
    rent: "Trọ",
    utilities: "Điện nước",
    rentAndUtilities: "Trọ + điện nước",
  },
} as const;

/** CSS custom properties for stat-fx.module.css. */
export function statFxVars(fx = STAT_FX): Record<`--${string}`, string> {
  return {
    "--fx-float-ms": `${fx.floatMs}ms`,
    "--fx-rise": `${fx.floatRisePx}px`,
    "--fx-float-ease": fx.floatEasing,
    "--fx-flash-ms": `${fx.flashMs}ms`,
    "--fx-shake-ms": `${fx.shakeMs}ms`,
    "--fx-shake-px": `${fx.shakePx}px`,
    "--fx-xfade-ms": `${fx.phaseXfadeMs}ms`,
    "--fx-gain": fx.colors.gainFill,
    "--fx-loss": fx.colors.lossFill,
    "--fx-time": fx.colors.timeFill,
    "--fx-ink": fx.colors.ink,
    "--fx-time-ink": fx.colors.timeInk,
    "--fx-border": fx.colors.border,
    "--fx-gain-flash": fx.colors.gainFlash,
    "--fx-loss-flash": fx.colors.lossFlash,
  };
}
