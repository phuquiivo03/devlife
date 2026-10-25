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
/** Base orbit angles of the classic iso view (yaw around +Y from +Z, pitch up from XZ). */
const BASE_YAW = Math.atan2(VIEW_DIR.x, VIEW_DIR.z);
const BASE_PITCH = Math.asin(VIEW_DIR.y);
/** Drag-orbit pitch clamps: low grazing shots are allowed, but never under the
 * floor and never fully top-down (both look broken with the iso framing). */
const MIN_PITCH = 0.12;
const MAX_PITCH = 1.5;
const clampPitch = (pitch: number) => Math.min(MAX_PITCH, Math.max(MIN_PITCH, pitch));
const dirFromAngles = (yaw: number, pitch: number) =>
  new Vector3(
    Math.cos(pitch) * Math.sin(yaw),
    Math.sin(pitch),
    Math.cos(pitch) * Math.cos(yaw),
  );

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
 * Auto-framing + player camera control: drag orbits the room around the
 * framed center (the debug view minus panning), wheel / trackpad-pinch /
 * two-finger-pinch zooms, double-click resets to the auto frame. Zoom and
 * rotation ease toward their targets so fast flicks stay smooth; with
 * prefers-reduced-motion they snap. A user adjustment is never overwritten —
 * only the clamp bounds follow a new base.
 */
function RoomCameraRig({ interactive }: { interactive: boolean }) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const scene = useThree((s) => s.scene);
  const baseZoom = useRef(110);
  const frameRef = useRef<RoomFrame | null>(null);
  const targetZoom = useRef<number | null>(null);
  const targetYaw = useRef(BASE_YAW);
  const targetPitch = useRef(BASE_PITCH);
  const yaw = useRef(BASE_YAW);
  const pitch = useRef(BASE_PITCH);
  const userAdjusted = useRef(false);

  // Frame the room once its meshes exist (assets stream in behind Suspense,
  // so poll briefly) and again whenever the canvas resizes. A user zoom or
  // rotation is never overwritten — only the clamp bounds follow the new base.
  useEffect(() => {
    if (size.height < 2) return;
    let ticks = 0;
    const frame = () => {
      const plan = computeRoomFrame(scene, size.height);
      if (!plan) return;
      baseZoom.current = plan.zoom;
      frameRef.current = plan;
      if (!userAdjusted.current) {
        targetZoom.current = plan.zoom;
        targetYaw.current = BASE_YAW;
        targetPitch.current = BASE_PITCH;
        yaw.current = BASE_YAW;
        pitch.current = BASE_PITCH;
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
    const applyZoomNow = () => {
      if (targetZoom.current == null) return;
      camera.zoom = targetZoom.current;
      camera.updateProjectionMatrix();
    };
    const applyRotationNow = () => {
      const center = frameRef.current?.target;
      if (!center) return;
      camera.position
        .copy(center)
        .addScaledVector(dirFromAngles(yaw.current, pitch.current), VIEW_DIST);
      camera.lookAt(center);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // deltaMode 1 = lines (Firefox); ctrlKey = trackpad pinch (small deltas).
      const dy = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * (e.ctrlKey ? 4 : 1);
      const current = targetZoom.current ?? camera.zoom;
      targetZoom.current = clamp(current * Math.exp(-dy * 0.0016));
      userAdjusted.current = true;
      if (reduce) applyZoomNow();
    };
    const onReset = () => {
      userAdjusted.current = false;
      targetZoom.current = baseZoom.current;
      targetYaw.current = BASE_YAW;
      targetPitch.current = BASE_PITCH;
      if (reduce) {
        yaw.current = BASE_YAW;
        pitch.current = BASE_PITCH;
        applyZoomNow();
        applyRotationNow();
      }
    };

    // Drag-orbit at roughly OrbitControls sensitivity (a canvas-height drag
    // is most of a full turn); one finger rotates, two fingers pinch-zoom.
    // touch-action keeps a drag from scrolling the page on touch devices.
    const rotateStep = () => (2 * Math.PI * 0.9) / Math.max(1, el.clientHeight);
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        el.style.cursor = "";
      } else {
        el.style.cursor = "grabbing";
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        const step = rotateStep();
        targetYaw.current -= dx * step;
        targetPitch.current = clampPitch(targetPitch.current + dy * step);
        userAdjusted.current = true;
        if (reduce) {
          yaw.current = targetYaw.current;
          pitch.current = targetPitch.current;
          applyRotationNow();
        }
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0 && dist > 0) {
          const current = targetZoom.current ?? camera.zoom;
          targetZoom.current = clamp(current * (dist / pinchDist));
          userAdjusted.current = true;
          if (reduce) applyZoomNow();
        }
        pinchDist = dist;
      }
    };
    const onPointerEnd = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      pinchDist = 0;
      if (pointers.size === 0) el.style.cursor = "grab";
    };

    const prevTouchAction = el.style.touchAction;
    el.style.touchAction = "none";
    el.style.cursor = "grab";
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onReset);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerEnd);
    el.addEventListener("pointercancel", onPointerEnd);
    return () => {
      el.style.touchAction = prevTouchAction;
      el.style.cursor = "";
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onReset);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerEnd);
      el.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [camera, gl, interactive]);

  useFrame((_, delta) => {
    if (!interactive || targetZoom.current == null || !frameRef.current) return;
    const center = frameRef.current.target;
    const follow = 1 - Math.exp(-delta * ZOOM_FOLLOW_RATE);
    const nextZoom =
      camera.zoom + (targetZoom.current - camera.zoom) * follow;
    if (Math.abs(nextZoom - camera.zoom) >= 0.01) {
      camera.zoom = nextZoom;
      camera.updateProjectionMatrix();
    }
    const nextYaw = yaw.current + (targetYaw.current - yaw.current) * follow;
    const nextPitch =
      pitch.current + (targetPitch.current - pitch.current) * follow;
    const moved =
      Math.abs(nextYaw - yaw.current) >= 0.0004 ||
      Math.abs(nextPitch - pitch.current) >= 0.0004;
    yaw.current = nextYaw;
    pitch.current = nextPitch;
    if (moved) {
      camera.position
        .copy(center)
        .addScaledVector(dirFromAngles(yaw.current, pitch.current), VIEW_DIST);
      camera.lookAt(center);
    }
  });
  return null;
}

/**
 * Fixed isometric orthographic view of the student room in a 4:3 slot.
 * The canvas is transparent; the wrapper div (`.clay-scene-well`) paints
 * the deep-purple gradient the room floats on. Loaded via next/dynamic
 * (ssr:false) so three stays out of SSR.
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
        {/* Debug gets full orbit (with panning); players get drag-orbit +
            zoom through the rig above. Both drive the camera, so never mount
            them together. */}
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
