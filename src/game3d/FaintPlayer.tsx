"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { LoopOnce, type AnimationClip, type Object3D } from "three";
import { useGameStore } from "@/game/state/store";
import { PLAYER_ANIM_URL } from "./assets";
import { FALL_HIPS_POSITION_TRACK, pinTrackXZ } from "./faint-clip";
import { faintPlacement } from "./faint-placement";

/**
 * `player_anim.glb` rest height is 1.0; `player_stand.glb` is 1.249.
 * Uniform scale keeps the falling body the same height as the standing mesh.
 */
const PLAYER_ANIM_SCALE = 1.249;
const NO_OWNED: readonly string[] = [];

function pinFallInPlace(clips: AnimationClip[]): AnimationClip | null {
  const fall = clips.find((clip) => clip.name === "fall");
  if (!fall) return null;
  const next = fall.clone();
  for (const track of next.tracks) {
    if (track.name === FALL_HIPS_POSITION_TRACK) pinTrackXZ(track.values);
  }
  return next;
}

/**
 * Plays the `fall` clip once the collapse starts and holds the last frame
 * until discharge. Mounted beside the static poses so a missing 3D scene
 * never blocks the hospital popup.
 */
export function FaintPlayer() {
  const fainting = useGameStore((s) => s.faint != null);
  const startedAt = useGameStore((s) => s.faint?.startedAt ?? 0);
  const showCharacter = useGameStore((s) => s.showCharacter);
  const stage = useGameStore((s) => s.stage);
  const owned = useGameStore((s) => s.career.shop?.owned ?? NO_OWNED);
  const loadout = useGameStore((s) => s.loadouts[stage]);
  const gltf = useGLTF(PLAYER_ANIM_URL);
  const { mixer } = useAnimations(gltf.animations, gltf.scene);
  const fallClip = useMemo(() => pinFallInPlace(gltf.animations), [gltf.animations]);
  const place = useMemo(
    () => faintPlacement({ stage, owned, loadout }),
    [stage, owned, loadout],
  );

  useEffect(() => {
    gltf.scene.traverse((obj) => {
      const mesh = obj as Object3D & { isMesh?: boolean; castShadow: boolean; receiveShadow: boolean; frustumCulled: boolean };
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
    });
  }, [gltf.scene]);

  useLayoutEffect(() => {
    if (!fallClip || startedAt <= 0) return;
    const action = mixer.clipAction(fallClip);
    action.reset();
    action.enabled = true;
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    mixer.update(0);
    return () => {
      action.stop();
    };
  }, [fallClip, mixer, startedAt]);

  if (!fainting || !showCharacter) return null;

  return (
    <primitive
      object={gltf.scene}
      position={place.position}
      rotation-y={place.rotationY}
      scale={PLAYER_ANIM_SCALE}
      dispose={null}
    />
  );
}
