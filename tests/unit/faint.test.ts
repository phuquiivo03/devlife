import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LIFE } from "@/game/life/content";
import {
  collapsedOnReload,
  FAINT_BEFORE_SIREN_MS,
  FAINT_DIM,
  FAINT_FADE_MS,
  faintBlocksInput,
  faintDelayRemaining,
  faintDimOpacity,
  FALL_CLIP_SECONDS,
} from "@/game/life/faint";
import { pinTrackXZ } from "@/game3d/faint-clip";
import { faintPlacement } from "@/game3d/faint-placement";
import { getRoomManifest } from "@/game3d/manifest";
import { useGameStore } from "@/game/state/store";

function fallClipEndSeconds(): number {
  const buf = readFileSync(resolve("public/models/characters/player_anim.glb"));
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let offset = 12;
  let json: {
    animations: { name: string; samplers: { input: number }[] }[];
    accessors: { max?: number[] }[];
  } | null = null;
  while (offset < buf.length) {
    const chunkLen = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const data = buf.subarray(offset + 8, offset + 8 + chunkLen);
    if (chunkType === 0x4e4f534a) json = JSON.parse(data.toString("utf8"));
    offset += 8 + chunkLen;
  }
  const fall = json?.animations.find((clip) => clip.name === "fall");
  let max = 0;
  for (const sampler of fall?.samplers ?? []) {
    const end = json?.accessors[sampler.input]?.max?.[0] ?? 0;
    if (end > max) max = end;
  }
  return max;
}

describe("faint timing", () => {
  it("waits out the fall clip, then a half-second dim, before the siren", () => {
    expect(fallClipEndSeconds()).toBeCloseTo(FALL_CLIP_SECONDS, 3);
    expect(FAINT_FADE_MS).toBe(500);
    expect(FAINT_BEFORE_SIREN_MS).toBe(Math.round(FALL_CLIP_SECONDS * 1000) + FAINT_FADE_MS);
    expect(faintDelayRemaining(1_000, 1_000)).toBe(FAINT_BEFORE_SIREN_MS);
    expect(faintDelayRemaining(1_000, 1_000 + FAINT_BEFORE_SIREN_MS + 20)).toBe(0);
  });

  it("keeps the screen clear during the fall and dims afterwards", () => {
    const fadeStart = FAINT_BEFORE_SIREN_MS - FAINT_FADE_MS;
    expect(faintDimOpacity(0, fadeStart - 1, false)).toBe(0);
    expect(faintDimOpacity(0, fadeStart + FAINT_FADE_MS / 2, false)).toBeCloseTo(FAINT_DIM / 2);
    expect(faintDimOpacity(0, FAINT_BEFORE_SIREN_MS, false)).toBe(FAINT_DIM);
    expect(faintDimOpacity(0, fadeStart + 1, true)).toBe(FAINT_DIM);
  });

  it("blocks input only while the fall is still playing", () => {
    expect(faintBlocksInput(null)).toBe(false);
    expect(faintBlocksInput({ startedAt: 1, admitted: false })).toBe(true);
    expect(faintBlocksInput({ startedAt: 1, admitted: true })).toBe(false);
  });

  it("treats a reloaded collapse as already admitted", () => {
    expect(collapsedOnReload(LIFE.hospital_below - 1)).toBe(true);
    expect(collapsedOnReload(LIFE.hospital_below)).toBe(false);
    expect(collapsedOnReload(LIFE.hospital_discharge_health)).toBe(false);
    expect(collapsedOnReload(undefined)).toBe(false);
  });
});

describe("faint clip", () => {
  it("keeps the hips drop and drops the forward slide", () => {
    const values = [1, 0.3, 2, 4, 0.1, 8];
    pinTrackXZ(values);
    expect(values).toEqual([1, 0.3, 2, 1, 0.1, 2]);
  });
});

describe("faint placement", () => {
  it("drops a seated body onto the floor at the chair, facing the way he sat", () => {
    const poses = getRoomManifest("student").poses;
    const place = faintPlacement({
      stage: "student",
      owned: ["ergo_chair"],
      loadout: {},
    });
    expect(place.position[0]).toBe(poses.sit.position[0]);
    expect(place.position[1]).toBe(poses.stand.position[1]);
    expect(place.position[2]).toBe(poses.sit.position[2]);
    expect(place.rotationY).toBe(poses.sit.rotationY);
  });

  it("plays the fall from the floor pose when he is already on the floor", () => {
    const poses = getRoomManifest("student").poses;
    const place = faintPlacement({ stage: "student", owned: [], loadout: {} });
    expect(place.position).toEqual([
      poses.floor.position[0],
      poses.floor.position[1],
      poses.floor.position[2],
    ]);
    expect(place.rotationY).toBe(poses.floor.rotationY);
  });
});

describe("faint store", () => {
  it("plays the faint before the hospital popup, then clears it on discharge", () => {
    const before = useGameStore.getState();
    try {
      useGameStore.setState({
        career: {
          ...before.career,
          players: { ...before.career.players, health: 12, fullness: 0 },
        },
        hospitalOpen: false,
        hospitalCost: 0,
        faint: null,
        openingStep: null,
        openingDone: true,
      });
      const minutes = useGameStore.getState().totalMinutes;
      useGameStore.getState().onMinute(40);
      const falling = useGameStore.getState();
      expect(falling.career.players.health).toBeLessThan(LIFE.hospital_below);
      expect(falling.hospitalOpen).toBe(false);
      expect(falling.faint?.admitted).toBe(false);
      expect(falling.faint?.startedAt).toBeGreaterThan(0);
      expect(falling.totalMinutes).toBe(minutes);

      const startedAt = falling.faint!.startedAt;
      useGameStore.getState().onMinute(40);
      useGameStore.getState().eat("noodles");
      useGameStore.getState().playGame();
      expect(useGameStore.getState().faint?.startedAt).toBe(startedAt);
      expect(useGameStore.getState().hospitalOpen).toBe(false);

      useGameStore.getState().completeFaint();
      const admitted = useGameStore.getState();
      expect(admitted.hospitalOpen).toBe(true);
      expect(admitted.hospitalCost).toBe(LIFE.hospital_cost);
      expect(admitted.faint?.admitted).toBe(true);
      expect(admitted.faint?.startedAt).toBe(startedAt);

      useGameStore.getState().completeFaint();
      expect(useGameStore.getState().faint?.startedAt).toBe(startedAt);

      useGameStore.getState().dischargeFromHospital();
      const discharged = useGameStore.getState();
      expect(discharged.hospitalOpen).toBe(false);
      expect(discharged.faint).toBeNull();
      expect(discharged.career.players.health).toBe(LIFE.hospital_discharge_health);
    } finally {
      useGameStore.setState({
        career: before.career,
        hospitalOpen: before.hospitalOpen,
        hospitalCost: before.hospitalCost,
        faint: before.faint,
        totalMinutes: before.totalMinutes,
        openingStep: before.openingStep,
        openingDone: before.openingDone,
      });
    }
  });

  it("starts the faint from a meal that drops health, without skipping days", () => {
    const before = useGameStore.getState();
    try {
      useGameStore.setState({
        career: {
          ...before.career,
          players: { ...before.career.players, health: 12, fullness: 20 },
        },
        hospitalOpen: false,
        hospitalCost: 0,
        faint: null,
        openingStep: null,
        openingDone: true,
      });
      const minutes = useGameStore.getState().totalMinutes;
      useGameStore.getState().eat("noodles");
      const next = useGameStore.getState();
      expect(next.career.players.health).toBeLessThan(LIFE.hospital_below);
      expect(next.hospitalOpen).toBe(false);
      expect(next.faint?.admitted).toBe(false);
      expect(next.totalMinutes).toBe(minutes);
    } finally {
      useGameStore.setState({
        career: before.career,
        hospitalOpen: before.hospitalOpen,
        hospitalCost: before.hospitalCost,
        faint: before.faint,
        totalMinutes: before.totalMinutes,
        openingStep: before.openingStep,
        openingDone: before.openingDone,
      });
    }
  });
});
