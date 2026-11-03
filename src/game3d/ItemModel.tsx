"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group, Material, Mesh, MeshStandardMaterial, Object3D } from "three";
import { characterUrl, itemUrl } from "./assets";
import type { ManifestItem } from "./manifest";

type Shadows = "both" | "cast" | "receive" | "none";

/** A press that travels farther than this is a camera drag, not a use. */
const CLICK_SLOP_PX = 5;

type Props = {
  item: ManifestItem;
  /** Characters resolve under /models/characters with their own file names. */
  kind?: "item" | "character";
  visible?: boolean;
  shadows?: Shadows;
  /** Spin the fan_standing "blades" child node around its hub axis. */
  spinBlades?: boolean;
  /** Click uses the item. Characters and props without an action stay inert. */
  onUse?: (key: string) => void;
};

function applyShadows(root: Object3D, mode: Shadows) {
  root.traverse((obj) => {
    const mesh = obj as Object3D & { isMesh?: boolean; castShadow: boolean; receiveShadow: boolean };
    if (!mesh.isMesh) return;
    mesh.castShadow = mode === "both" || mode === "cast";
    mesh.receiveShadow = mode === "both" || mode === "receive";
  });
}

/** GLTF clone() shares materials. Hover must tint only this instance. */
function cloneMaterials(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || mesh.material == null) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => material.clone())
      : mesh.material.clone();
  });
}

type HoverMat = MeshStandardMaterial & {
  userData: {
    baseEmissive?: MeshStandardMaterial["emissive"];
    baseIntensity?: number;
    baseColor?: MeshStandardMaterial["color"];
  };
};

function paintHover(root: Object3D, on: boolean) {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || mesh.material == null) return;
    const list: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      const mat = material as HoverMat;
      if (mat.emissive) {
        if (on) {
          if (!mat.userData.baseEmissive) {
            mat.userData.baseEmissive = mat.emissive.clone();
            mat.userData.baseIntensity = mat.emissiveIntensity ?? 1;
          }
          mat.emissive.set("#fff4e0");
          mat.emissiveIntensity = (mat.userData.baseIntensity ?? 0) + 0.35;
        } else if (mat.userData.baseEmissive) {
          mat.emissive.copy(mat.userData.baseEmissive);
          mat.emissiveIntensity = mat.userData.baseIntensity ?? 1;
        }
      } else if (mat.color) {
        if (on) {
          if (!mat.userData.baseColor) mat.userData.baseColor = mat.color.clone();
          mat.color.copy(mat.userData.baseColor).multiplyScalar(1.18);
        } else if (mat.userData.baseColor) {
          mat.color.copy(mat.userData.baseColor);
        }
      }
    }
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
  onUse,
}: Props) {
  const url =
    kind === "character" ? characterUrl(item.key) : item.url ?? itemUrl(item.key);
  const { scene } = useGLTF(url);
  const gl = useThree((state) => state.gl);
  const clone = useMemo(() => {
    const copy = scene.clone(true) as Group;
    cloneMaterials(copy);
    applyShadows(copy, shadows);
    return copy;
  }, [scene, shadows]);

  const bladesRef = useRef<Object3D | null>(null);
  const hoveredRef = useRef(false);
  useEffect(() => {
    bladesRef.current = spinBlades ? clone.getObjectByName("blades") ?? null : null;
  }, [clone, spinBlades]);
  useEffect(() => {
    if (!visible && hoveredRef.current) {
      hoveredRef.current = false;
      paintHover(clone, false);
      gl.domElement.style.cursor = "grab";
    }
  }, [visible, clone, gl]);
  useFrame((_, delta) => {
    const blades = bladesRef.current;
    if (blades) blades.rotation.z += delta * 9;
  });

  const interactive = visible && onUse != null;

  return (
    <group
      onPointerOver={(event) => {
        if (!interactive) return;
        event.stopPropagation();
        hoveredRef.current = true;
        paintHover(clone, true);
        gl.domElement.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (!hoveredRef.current) return;
        hoveredRef.current = false;
        paintHover(clone, false);
        gl.domElement.style.cursor = "grab";
      }}
      onPointerDown={(event) => {
        if (!interactive || !onUse) return;
        if (!event.nativeEvent.isPrimary) return;
        const startX = event.nativeEvent.clientX;
        const startY = event.nativeEvent.clientY;
        let dragged = false;
        let armed = false;
        queueMicrotask(() => {
          armed = true;
        });
        const slop = CLICK_SLOP_PX * CLICK_SLOP_PX;
        const onMove = (move: PointerEvent) => {
          const dx = move.clientX - startX;
          const dy = move.clientY - startY;
          if (dx * dx + dy * dy > slop) dragged = true;
        };
        const onUp = (up: PointerEvent) => {
          const dx = up.clientX - startX;
          const dy = up.clientY - startY;
          if (dx * dx + dy * dy > slop) dragged = true;
          // A pointerup in the same turn as the press is the capture echo.
          if (!armed) return;
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          if (dragged) return;
          onUse(item.key);
          if (hoveredRef.current) {
            queueMicrotask(() => {
              if (hoveredRef.current) gl.domElement.style.cursor = "pointer";
            });
          }
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      }}
    >
      <primitive
        object={clone}
        position={item.position}
        rotation-y={item.rotationY}
        visible={visible}
      />
    </group>
  );
}
