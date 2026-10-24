"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useProgress } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  Box3,
  Vector3,
  type OrthographicCamera,
  type Scene,
} from "three";
import { Furniture } from "./Furniture";
import { Lights } from "./lights";
import { Player } from "./Player";
import { RoomShell } from "./RoomShell";

/** How much of the frame height the loaded room box should fill (80–85%). */
const ROOM_FILL = 0.825;
/** Wheel-zoom clamp around the auto-framed base zoom. */
const MIN_ZOOM_RATIO = 0.45;
const MAX_ZOOM_RATIO = 2.2;
/** Exponential follow rate (1/s): settles in ~250 ms, no bounce. */
const ZOOM_FOLLOW_RATE = 14;
/** Classic iso view direction (old camera: (6,6,6) looking at (0,0.8,0)).
 * Framing recenters on the room box but keeps this direction. */
const VIEW_DIR = new Vector3(6, 5.2, 6).normalize();
const VIEW_DIST = new Vector3(6, 5.2, 6).length();
/** Screen-up axis of the iso view, precomputed from VIEW_DIR. */
const UP_SCREEN = new Vector3(0, 1, 0).addScaledVector(VIEW_DIR, -VIEW_DIR.y)
  .normalize();

type RoomFrame = { zoom: number; position: Vector3; target: Vector3 };

/**
 * Auto-frame the room: zoom and recenter so the scene bounding box fills
 * ROOM_FILL of the canvas height. Returns null until meshes exist.
 */
function computeRoomFrame(
  scene: Scene,
  canvasHeightPx: number,
): RoomFrame | null {
  const box = new Box3().setFromObject(scene);
  if (box.isEmpty()) return null;
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const worldH =
    size.x * Math.abs(UP_SCREEN.x) +
    size.y * Math.abs(UP_SCREEN.y) +
    size.z * Math.abs(UP_SCREEN.z);
  if (!Number.isFinite(worldH) || worldH <= 0) return null;
  return {
    zoom: (canvasHeightPx * ROOM_FILL) / worldH,
    target: center,
    position: center.clone().addScaledVector(VIEW_DIR, VIEW_DIST),
  };
}

/**
 * Auto-framing + wheel zoom for the room view. Wheel / trackpad-pinch zoom,
 * double-click resets to the auto frame. The camera eases toward the target
 * zoom so fast flicks stay smooth; with prefers-reduced-motion it snaps.
 */
function RoomCameraRig({ interactive }: { interactive: boolean }) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const scene = useThree((s) => s.scene);
  const baseZoom = useRef(110);
  const targetZoom = useRef<number | null>(null);
  const userZoomed = useRef(false);

  // Frame the room once its meshes exist (assets stream in behind Suspense,
  // so poll briefly) and again whenever the canvas resizes. A user zoom is
  // never overwritten — only the clamp bounds follow the new base.
  useEffect(() => {
    if (size.height < 2) return;
    let ticks = 0;
    const frame = () => {
      const plan = computeRoomFrame(scene, size.height);
      if (!plan) return;
      baseZoom.current = plan.zoom;
      if (!userZoomed.current) {
        targetZoom.current = plan.zoom;
        camera.position.copy(plan.position);
        camera.lookAt(plan.target);
        camera.zoom = plan.zoom;
        camera.updateProjectionMatrix();
      }
    };
    frame();
    const poll = window.setInterval(() => {
      frame();
      ticks += 1;
      if (ticks >= 16) window.clearInterval(poll);
    }, 250);
    return () => window.clearInterval(poll);
  }, [scene, camera, size.width, size.height]);

  useEffect(() => {
    if (!interactive) return;
    const el = gl.domElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (zoom: number) =>
      Math.min(
        baseZoom.current * MAX_ZOOM_RATIO,
        Math.max(baseZoom.current * MIN_ZOOM_RATIO, zoom),
      );
    const applyNow = () => {
      if (targetZoom.current == null) return;
      camera.zoom = targetZoom.current;
      camera.updateProjectionMatrix();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // deltaMode 1 = lines (Firefox); ctrlKey = trackpad pinch (small deltas).
      const dy = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * (e.ctrlKey ? 4 : 1);
      const current = targetZoom.current ?? camera.zoom;
      targetZoom.current = clamp(current * Math.exp(-dy * 0.0016));
      userZoomed.current = true;
      if (reduce) applyNow();
    };
    const onReset = () => {
      userZoomed.current = false;
      targetZoom.current = baseZoom.current;
      if (reduce) applyNow();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onReset);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onReset);
    };
  }, [camera, gl, interactive]);

  useFrame((_, delta) => {
    if (!interactive || targetZoom.current == null) return;
    const next = camera.zoom + (targetZoom.current - camera.zoom) * (1 - Math.exp(-delta * ZOOM_FOLLOW_RATE));
    if (Math.abs(next - camera.zoom) < 0.01) return;
    camera.zoom = next;
    camera.updateProjectionMatrix();
  });
  return null;
}

/**
 * Fixed isometric orthographic view of the student room in a 4:3 slot.
 * The canvas is transparent; the wrapper div (`.clay-scene-well`) paints
 * the deep-purple gradient the room floats on. Loaded behind the `?3d=1`
 * flag via next/dynamic (ssr:false) so three never enters the 2D bundle.
 */
export default function Scene3D({ debug = false }: { debug?: boolean }) {
  return (
    <div
      className="clay-scene-well relative w-full"
      style={{ aspectRatio: "4 / 3" }}
      role="img"
      aria-label="Phòng trọ 3D"
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        orthographic
        camera={{ position: [6, 6, 6], zoom: 110, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.8, 0)}
      >
        <Lights />
        <Suspense fallback={null}>
          <RoomShell />
          <Furniture />
          <Player />
        </Suspense>
        <RoomCameraRig interactive={!debug} />
        {/* Debug gets full orbit; players get wheel zoom only. Both drive the
            camera, so never mount them together. */}
        {debug ? <OrbitControls target={[0, 0.8, 0]} /> : null}
      </Canvas>
      <Scene3DLoadHint />
    </div>
  );
}

function Scene3DLoadHint() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="clay-scene-loadhint absolute inset-0 grid place-items-center font-galmuri-9 text-galmuri-body">
      Đang tải 3D… {Math.round(progress)}%
    </div>
  );
}
