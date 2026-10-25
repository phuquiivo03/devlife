"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  PointLight,
} from "three";
import { useGameStore } from "@/game/state/store";
import { getRoom } from "@/game/content";
import { phaseAtMinuteOfDay } from "@/game/time";
import { resolveRoomFurniture } from "./slot-models";
import { STUDENT_MANIFEST, itemByKey } from "./manifest";
import {
  HEMI_GROUND,
  HEMI_I,
  LIGHT_PRESETS,
  mixPreset,
  type LightPreset,
} from "./light-presets";

/** Phase crossfade duration, matching the trailer's 14-frame lerp. */
const TWEEN_MS = 500;

/** Base screen-spill strengths (scaled by the preset's per-phase factor). */
const MONITOR_BASE = 0.5;
const LAPTOP_BASE = 0.35;

function at(
  stage: string,
  key: string,
  offset: [number, number, number],
): [number, number, number] | null {
  // The laptop only exists in the student stage0 set; other rooms place it
  // through a slot, so itemByKey alone finds it there.
  const item =
    itemByKey(stage, key) ??
    (stage === "student" ? STUDENT_MANIFEST.stage0.items.find((i) => i.key === key) : undefined);
  if (!item) return null;
  return [item.position[0] + offset[0], item.position[1] + offset[1], item.position[2] + offset[2]];
}

/**
 * Cozy clay lighting that follows the clock: ambient / hemisphere / sun read
 * the phase preset (see light-presets.ts) and crossfade over ~500 ms when the
 * phase changes; the desk lamp and fairy string only glow from evening on.
 * Positions derive from the merged manifest placements. The lamp pool follows
 * the desk_lamp slot: mounted only while the loadout actually places the lamp,
 * while the fairy point mounts whenever the stage manifest has fairy_lights.
 */
export function Lights({ wellEl }: { wellEl?: { readonly current: HTMLElement | null } }) {
  const stage = useGameStore((s) => s.stage);
  const loadout = useGameStore((s) => s.loadouts[stage]);
  const owned = useGameStore((s) => s.career.shop?.owned);
  // Derived selector: re-renders only when the phase itself changes, not on
  // every game-minute tick.
  const phaseId = useGameStore((s) => phaseAtMinuteOfDay(s.totalMinutes).id);

  const lampDrawn = useMemo(() => {
    const plan = resolveRoomFurniture(
      getRoom(stage).slots,
      loadout,
      new Set(owned ?? []),
      stage,
    );
    return plan.drawn.has("lamp_desk");
  }, [stage, loadout, owned]);

  const lamp = lampDrawn ? at(stage, "lamp_desk", [0.12, 0.34, 0]) : null;
  const monitor = at(stage, "monitor", [0.26, 0.3, 0]);
  const laptop = at(stage, "laptop", [0.16, 0.16, 0]);
  const fairy = itemByKey(stage, "fairy_lights");

  const hemiRef = useRef<HemisphereLight>(null);
  const ambRef = useRef<AmbientLight>(null);
  const sunRef = useRef<DirectionalLight>(null);
  const lampRef = useRef<PointLight>(null);
  const fairyRef = useRef<PointLight>(null);
  const monitorRef = useRef<PointLight>(null);
  const laptopRef = useRef<PointLight>(null);

  // Mount-time phase, captured once: JSX initial values stay stable across
  // re-renders so React never fights the per-frame tween.
  const initRef = useRef<LightPreset | null>(null);
  if (!initRef.current) initRef.current = LIGHT_PRESETS[phaseId];
  const init = initRef.current;

  // Tween clock: lights are written straight to the objects in useFrame —
  // no per-frame state. On a phase change the blend restarts from wherever
  // the previous crossfade was interrupted.
  const tween = useRef<{ from: LightPreset; to: LightPreset; t: number; phase: typeof phaseId }>({
    from: init,
    to: init,
    t: 1,
    phase: phaseId,
  });
  // The mount phase never triggers a change, so push the initial preset to
  // the objects (and the well vars) once on the first frame.
  const appliedOnce = useRef(false);

  useFrame((_, delta) => {
    const tw = tween.current;
    if (tw.phase !== phaseId) {
      tw.from = mixPreset(tw.from, tw.to, tw.t);
      tw.to = LIGHT_PRESETS[phaseId];
      tw.t = 0;
      tw.phase = phaseId;
    }
    if (appliedOnce.current && tw.t >= 1) return;
    appliedOnce.current = true;
    tw.t = Math.min(1, tw.t + (delta * 1000) / TWEEN_MS);
    // Smoothstep so the crossfade eases at both ends.
    const e = tw.t * tw.t * (3 - 2 * tw.t);
    const p = mixPreset(tw.from, tw.to, e);

    const hemi = hemiRef.current;
    if (hemi) hemi.color.set(p.hemiSky);
    const amb = ambRef.current;
    if (amb) {
      amb.color.set(p.amb);
      amb.intensity = p.ambI;
    }
    const sun = sunRef.current;
    if (sun) {
      sun.color.set(p.sun);
      sun.intensity = p.sunI;
      sun.position.set(p.sunPos[0], p.sunPos[1], p.sunPos[2]);
    }
    const lampLight = lampRef.current;
    if (lampLight) {
      lampLight.intensity = p.lamp;
      lampLight.visible = p.lamp > 0.05;
    }
    const fairyLight = fairyRef.current;
    if (fairyLight) {
      fairyLight.intensity = p.lamp * 0.6;
      fairyLight.visible = p.lamp > 0.05;
    }
    const spill = p.spill;
    const monitorLight = monitorRef.current;
    if (monitorLight) monitorLight.intensity = MONITOR_BASE * spill;
    const laptopLight = laptopRef.current;
    if (laptopLight) laptopLight.intensity = LAPTOP_BASE * spill;

    const well = wellEl?.current;
    if (well) {
      well.style.setProperty("--scene-bg-a", p.bg[0]);
      well.style.setProperty("--scene-bg-b", p.bg[1]);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemiRef} args={[init.hemiSky, HEMI_GROUND, HEMI_I]} />
      <ambientLight ref={ambRef} args={[init.amb, init.ambI]} />
      <directionalLight
        ref={sunRef}
        position={init.sunPos}
        intensity={init.sunI}
        color={init.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      {lamp ? (
        <pointLight
          ref={lampRef}
          position={lamp}
          color="#ffc27a"
          intensity={init.lamp}
          visible={init.lamp > 0.05}
          distance={6}
          decay={1.4}
        />
      ) : null}
      {monitor ? (
        <pointLight
          ref={monitorRef}
          position={monitor}
          color="#9fc7ff"
          intensity={MONITOR_BASE * init.spill}
          distance={1.8}
          decay={2}
        />
      ) : null}
      {laptop ? (
        <pointLight
          ref={laptopRef}
          position={laptop}
          color="#9fc7ff"
          intensity={LAPTOP_BASE * init.spill}
          distance={1.2}
          decay={2}
        />
      ) : null}
      {fairy ? (
        <pointLight
          ref={fairyRef}
          position={[fairy.position[0], fairy.position[1] + 0.08, fairy.position[2]]}
          color="#ffd9a8"
          intensity={init.lamp * 0.6}
          visible={init.lamp > 0.05}
          distance={5}
          decay={1.4}
        />
      ) : null}
    </>
  );
}
