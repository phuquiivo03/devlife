"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group, Object3D } from "three";
import { characterUrl, itemUrl } from "./assets";
import type { ManifestItem } from "./manifest";

type Shadows = "both" | "cast" | "receive" | "none";

type Props = {
  item: ManifestItem;
  /** Characters resolve under /models/characters with their own file names. */
  kind?: "item" | "character";
  visible?: boolean;
  shadows?: Shadows;
  /** Spin the fan_standing "blades" child node around its hub axis. */
  spinBlades?: boolean;
};

function applyShadows(root: Object3D, mode: Shadows) {
  root.traverse((obj) => {
    const mesh = obj as Object3D & { isMesh?: boolean; castShadow: boolean; receiveShadow: boolean };
    if (!mesh.isMesh) return;
    mesh.castShadow = mode === "both" || mode === "cast";
    mesh.receiveShadow = mode === "both" || mode === "receive";
  });
}

/**
 * Renders one manifest item: cloned GLTF scene at the manifest transform.
 * Models stay mounted and toggle visibility so the shared GLTF cache is never
 * re-suspended or disposed on pose/ownership changes.
 */
export function ItemModel({
  item,
  kind = "item",
  visible = true,
  shadows = "both",
  spinBlades = false,
}: Props) {
  const url =
    kind === "character" ? characterUrl(item.key) : item.url ?? itemUrl(item.key);
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const copy = scene.clone(true) as Group;
    applyShadows(copy, shadows);
    return copy;
  }, [scene, shadows]);

  const bladesRef = useRef<Object3D | null>(null);
  useEffect(() => {
    bladesRef.current = spinBlades ? clone.getObjectByName("blades") ?? null : null;
  }, [clone, spinBlades]);
  useFrame((_, delta) => {
    const blades = bladesRef.current;
    if (blades) blades.rotation.z += delta * 9;
  });

  return (
    <primitive
      object={clone}
      position={item.position}
      rotation-y={item.rotationY}
      visible={visible}
    />
  );
}
