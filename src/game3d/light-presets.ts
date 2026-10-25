import type { PhaseId } from "@/game/time";

/**
 * Time-of-day lighting look, ported 1:1 from the trailer v3 TOD table
 * (devlife-trailer3d Main.tsx). One preset per clock phase; the room lights
 * and the `.clay-scene-well` backdrop both read from it and crossfade over
 * ~500 ms when the phase changes.
 */
export type LightPreset = {
  /** Ambient light color + intensity. */
  amb: string;
  ambI: number;
  /** Hemisphere sky color (ground is the fixed HEMI_GROUND). */
  hemiSky: string;
  /** Directional "sun": color, intensity, position. */
  sun: string;
  sunI: number;
  sunPos: [number, number, number];
  /** Desk-lamp point-light intensity (0 = day, lamp off). */
  lamp: number;
  /** `.clay-scene-well` backdrop gradient, 160° top-left → bottom-right. */
  bg: [string, string];
  /** Monitor/laptop screen-spill multiplier (screens matter more in the dark). */
  spill: number;
};

export const LIGHT_PRESETS: Record<PhaseId, LightPreset> = {
  morning: {
    amb: "#fff4ea",
    ambI: 0.9,
    hemiSky: "#fff6ee",
    sun: "#fff0d8",
    sunI: 2.4,
    sunPos: [4, 9, 6],
    lamp: 0,
    bg: ["#8f7fae", "#b8a6cf"],
    spill: 0.3,
  },
  noon: {
    amb: "#ffe2c4",
    ambI: 0.8,
    hemiSky: "#ffd9b0",
    sun: "#ffb877",
    sunI: 2.6,
    sunPos: [8, 5, 2],
    lamp: 0,
    bg: ["#a7809e", "#e2b8a9"],
    spill: 0.3,
  },
  evening: {
    amb: "#d7b3d9",
    ambI: 0.55,
    hemiSky: "#c99ad1",
    sun: "#ff8fa8",
    sunI: 0.9,
    sunPos: [8, 3, -2],
    lamp: 5,
    bg: ["#6e5a92", "#a0789f"],
    spill: 1,
  },
  night: {
    amb: "#8e95d8",
    ambI: 0.42,
    hemiSky: "#6f78c9",
    sun: "#9fb0ff",
    sunI: 0.5,
    sunPos: [-3, 8, 6],
    lamp: 7,
    bg: ["#3f3b6e", "#6b5d93"],
    spill: 1.2,
  },
};

export const HEMI_GROUND = "#8a6f8f";
export const HEMI_I = 0.6;

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const ch = (i: number) => Math.round(ca[i]! + (cb[i]! - ca[i]!) * t);
  const packed = (1 << 24) | (ch(0) << 16) | (ch(1) << 8) | ch(2);
  return `#${packed.toString(16).slice(1)}`;
}

const mixNum = (a: number, b: number, t: number) => a + (b - a) * t;

/** Per-channel lerp of two presets: hex colors, scalars, and sunPos. */
export function mixPreset(a: LightPreset, b: LightPreset, t: number): LightPreset {
  return {
    amb: mixHex(a.amb, b.amb, t),
    ambI: mixNum(a.ambI, b.ambI, t),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, t),
    sun: mixHex(a.sun, b.sun, t),
    sunI: mixNum(a.sunI, b.sunI, t),
    sunPos: [
      mixNum(a.sunPos[0], b.sunPos[0], t),
      mixNum(a.sunPos[1], b.sunPos[1], t),
      mixNum(a.sunPos[2], b.sunPos[2], t),
    ],
    lamp: mixNum(a.lamp, b.lamp, t),
    bg: [mixHex(a.bg[0], b.bg[0], t), mixHex(a.bg[1], b.bg[1], t)],
    spill: mixNum(a.spill, b.spill, t),
  };
}
