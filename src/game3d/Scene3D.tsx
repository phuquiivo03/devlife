"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useProgress } from "@react-three/drei";
import { ACESFilmicToneMapping, type OrthographicCamera } from "three";
import { Furniture } from "./Furniture";
import { Lights } from "./lights";
import { Player } from "./Player";
import { RoomShell } from "./RoomShell";

const BASE_ZOOM = 110;
const MIN_ZOOM = 55;
const MAX_ZOOM = 240;
/** Exponential follow rate (1/s): settles in ~250 ms, no bounce. */
const ZOOM_FOLLOW_RATE = 14;

/**
 * Wheel / trackpad-pinch zoom for the room view, double-click to reset. The
 * camera eases toward the target zoom so fast flicks stay smooth; with
 * prefers-reduced-motion it snaps instead.
 */
function RoomZoom() {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const gl = useThree((s) => s.gl);
  const target = useRef(camera.zoom);

  useEffect(() => {
    const el = gl.domElement;
    target.current = camera.zoom;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const applyNow = () => {
      camera.zoom = target.current;
      camera.updateProjectionMatrix();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // deltaMode 1 = lines (Firefox); ctrlKey = trackpad pinch (small deltas).
      const dy = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * (e.ctrlKey ? 4 : 1);
      target.current = clamp(target.current * Math.exp(-dy * 0.0016));
      if (reduce) applyNow();
    };
    const onReset = () => {
      target.current = BASE_ZOOM;
      if (reduce) applyNow();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onReset);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onReset);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const next = camera.zoom + (target.current - camera.zoom) * (1 - Math.exp(-delta * ZOOM_FOLLOW_RATE));
    if (Math.abs(next - camera.zoom) < 0.01) return;
    camera.zoom = next;
    camera.updateProjectionMatrix();
  });
  return null;
}

/**
 * Fixed isometric orthographic view of the student room, framed like the 2D
 * canvas slot (427:240). Loaded behind the `?3d=1` flag via next/dynamic
 * (ssr:false) so three never enters the 2D bundle.
 */
export default function Scene3D({ debug = false }: { debug?: boolean }) {
  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: "427 / 240" }}
      role="img"
      aria-label="Phòng trọ 3D"
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        orthographic
        camera={{ position: [6, 6, 6], zoom: 110, near: 0.1, far: 100 }}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.8, 0)}
      >
        <color attach="background" args={["#f2ead9"]} />
        <Lights />
        <Suspense fallback={null}>
          <RoomShell />
          <Furniture />
          <Player />
        </Suspense>
        {/* Debug gets full orbit; players get wheel zoom only. Both drive the
            camera, so never mount them together. */}
        {debug ? (
          <OrbitControls target={[0, 0.8, 0]} />
        ) : (
          <RoomZoom />
        )}
      </Canvas>
      <Scene3DLoadHint />
    </div>
  );
}

function Scene3DLoadHint() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#f2ead9] font-galmuri-9 text-galmuri-body">
      Đang tải 3D… {Math.round(progress)}%
    </div>
  );
}
