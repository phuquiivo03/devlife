import { describe, expect, it } from "vitest";
import { LIGHT_PRESETS, mixPreset } from "@/game3d/light-presets";

describe("light presets", () => {
  it("covers every clock phase", () => {
    expect(Object.keys(LIGHT_PRESETS).sort()).toEqual([
      "evening",
      "morning",
      "night",
      "noon",
    ]);
  });

  it("keeps the lamp off by day and glowing from evening on", () => {
    expect(LIGHT_PRESETS.morning.lamp).toBe(0);
    expect(LIGHT_PRESETS.noon.lamp).toBe(0);
    expect(LIGHT_PRESETS.evening.lamp).toBeGreaterThan(0);
    expect(LIGHT_PRESETS.night.lamp).toBeGreaterThan(LIGHT_PRESETS.evening.lamp);
  });

  it("mixes endpoints exactly", () => {
    const a = LIGHT_PRESETS.morning;
    const b = LIGHT_PRESETS.night;
    expect(mixPreset(a, b, 0)).toEqual(a);
    expect(mixPreset(a, b, 1)).toEqual(b);
  });

  it("lerps colors, scalars, and sunPos per channel", () => {
    const mixed = mixPreset(LIGHT_PRESETS.morning, LIGHT_PRESETS.night, 0.5);
    expect(mixed.amb).toBe("#c7c5e1"); // (#fff4ea + #8e95d8) / 2
    expect(mixed.ambI).toBeCloseTo((0.9 + 0.42) / 2);
    expect(mixed.lamp).toBeCloseTo(3.5);
    expect(mixed.sunPos[0]).toBeCloseTo((4 + -3) / 2);
    expect(mixed.bg).toEqual(["#675d8e", "#9282b1"]); // per-stop midpoint
    expect(mixed.spill).toBeCloseTo((0.3 + 1.2) / 2);
  });
});
