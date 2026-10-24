import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  STAT_FX,
  statFxVars,
} from "@/components/game/stat-fx.config";
import {
  signedVnd,
  signedInt,
  diffStats,
  moneyLabel,
  easeOutCubic,
  tweenValue,
  tweenMsFor,
  sampleCareer,
  STAT_ORDER,
} from "@/components/game/stat-fx";

describe("stat-fx config", () => {
  it("has correct defaults", () => {
    expect(STAT_FX.floatMs).toBe(800);
    expect(STAT_FX.floatRisePx).toBe(24);
    expect(STAT_FX.floatStaggerMs).toBe(120);
    expect(STAT_FX.aggregateMs).toBe(40);
    expect(STAT_FX.tweenMs).toBe(500);
    expect(STAT_FX.tweenBigMs).toBe(600);
    expect(STAT_FX.flashMs).toBe(450);
    expect(STAT_FX.bigMoneyVnd).toBe(1_000_000);
    expect(STAT_FX.clockFfMs).toBe(600);
    expect(STAT_FX.clockSleepMs).toBe(1200);
  });

  it("statFxVars returns CSS vars", () => {
    const vars = statFxVars();
    expect(vars["--fx-float-ms"]).toBe("800ms");
    expect(vars["--fx-rise"]).toBe("24px");
  });
});

describe("signed formatting", () => {
  it("formats VND with U+2212", () => {
    expect(signedVnd(150000)).toBe("+150.000đ");
    expect(signedVnd(-35000)).toBe("−35.000đ");
  });

  it("formats int with U+2212", () => {
    expect(signedInt(2)).toBe("+2");
    expect(signedInt(-5)).toBe("−5");
  });
});

describe("diffStats", () => {
  const base = {
    money: 1_250_000,
    health: 70,
    mood: 70,
    energy: 62,
    fullness: 100,
    reputation: 18,
    paidSalaryKey: null,
    paidRentKey: null,
    paidUtilitiesKey: null,
  };

  it("no change -> empty", () => {
    expect(diffStats(base, base)).toEqual([]);
  });

  it("money + job, energy - , reputation +", () => {
    const next = { ...base, money: 1_600_000, energy: 54, reputation: 20 };
    const specs = diffStats(base, next);
    expect(specs).toHaveLength(3);
    expect(specs[0].key).toBe("money");
    expect(specs[0].text).toBe("+350.000đ");
    expect(specs[0].delayMs).toBe(0);
    expect(specs[1].key).toBe("energy");
    expect(specs[1].text).toBe("−8");
    expect(specs[1].delayMs).toBe(120);
    expect(specs[2].key).toBe("reputation");
    expect(specs[2].text).toBe("+2");
  });

  it("eating floats a rice gain with the real delta", () => {
    const specs = diffStats({ ...base, fullness: 10 }, { ...base, fullness: 100 });
    expect(specs).toEqual([expect.objectContaining({ key: "fullness", text: "+90 🍚", tone: "gain" })]);
  });

  it("never floats a fullness loss (per-minute drain, wake reset)", () => {
    expect(diffStats(base, { ...base, fullness: 10 })).toEqual([]);
    expect(diffStats({ ...base, fullness: 58.4 }, { ...base, fullness: 58.2 })).toEqual([]);
  });

  it("rounds vitals for display", () => {
    const a = { ...base, mood: 58.4 };
    const b = { ...base, mood: 59.6 };
    const specs = diffStats(a, b);
    expect(specs).toHaveLength(1);
    expect(specs[0].text).toBe("+1");
  });

  it("no spec for sub-unit rounding", () => {
    const a = { ...base, mood: 58.4 };
    const b = { ...base, mood: 58.6 };
    expect(diffStats(a, b)).toEqual([]);
  });

  it("big money flag", () => {
    const a = { ...base, money: 0 };
    const b = { ...base, money: 999_999 };
    expect(diffStats(a, b)[0].big).toBe(false);
    const c = { ...base, money: 1_000_000 };
    expect(diffStats(a, c)[0].big).toBe(true);
  });
});

describe("moneyLabel", () => {
  const base = {
    money: 0,
    health: 0,
    mood: 0,
    energy: 0,
    fullness: 0,
    reputation: 0,
    paidSalaryKey: null,
    paidRentKey: null,
    paidUtilitiesKey: null,
  };

  it("salary", () => {
    const next = { ...base, paidSalaryKey: "1-1" };
    expect(moneyLabel(base, next)).toBe("Lương");
  });

  it("rent + utilities", () => {
    const next = { ...base, paidRentKey: "1-1", paidUtilitiesKey: "1-1" };
    expect(moneyLabel(base, next)).toBe("Trọ + điện nước");
  });

  it("no change", () => {
    const next = { ...base, paidSalaryKey: null };
    expect(moneyLabel(base, next)).toBeNull();
  });
});

describe("tween", () => {
  it("easeOutCubic", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
  });

  it("tweenValue", () => {
    expect(tweenValue(0, 100, 0, 500)).toBe(0);
    expect(tweenValue(0, 100, 500, 500)).toBe(100);
    expect(tweenValue(0, 100, 250, 500)).toBeCloseTo(87.5);
    expect(tweenValue(100, 60, 250, 500)).toBeCloseTo(65);
  });

  it("tweenMsFor", () => {
    expect(tweenMsFor("money", 2_200_000)).toBe(600);
    expect(tweenMsFor("money", 35_000)).toBe(500);
    expect(tweenMsFor("energy", -8)).toBe(500);
  });
});

describe("source checks", () => {
  it("PlayerHudCard uses new hooks", () => {
    const src = readFileSync("src/components/game/PlayerHudCard.tsx", "utf8");
    expect(src).not.toContain("useVitalFloaters");
    expect(src).not.toContain("vital-floater");
    expect(src).toContain("StatFloaters");
    expect(src).toContain("useTweenedNumber");
  });

  it("GameShell uses useStatFx", () => {
    const src = readFileSync("src/components/game/GameShell.tsx", "utf8");
    expect(src).toContain("useStatFx(hydrated)");
  });

  it("CareerChrome removed money floater", () => {
    const src = readFileSync("src/components/game/career/CareerChrome.tsx", "utf8");
    expect(src).toContain('playCueKey("toast")');
    expect(src).not.toContain("formatVnd(event.delta)");
  });
});
