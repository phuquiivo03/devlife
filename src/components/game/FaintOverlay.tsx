"use client";

import { useEffect, useRef } from "react";
import { faintBlocksInput, faintDelayRemaining, faintDimOpacity } from "@/game/life/faint";
import { useGameStore } from "@/game/state/store";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const BLOCKED_EVENTS = ["keydown", "keyup", "pointerdown", "pointerup", "click", "auxclick", "contextmenu", "wheel"] as const;

/**
 * Full-screen dim and input lock for the collapse. The timer lives here, not
 * in the 3D scene, so the siren and hospital popup still arrive if the canvas
 * never mounts. Opacity is written on the node so the fade does not re-render
 * the shell every frame.
 */
export function FaintOverlay() {
  const blocking = useGameStore((s) => faintBlocksInput(s.faint));
  const startedAt = useGameStore((s) =>
    s.faint != null && !s.faint.admitted ? s.faint.startedAt : 0,
  );
  const dimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!blocking || startedAt <= 0) return;
    const wait = faintDelayRemaining(startedAt, Date.now());
    const id = window.setTimeout(() => {
      useGameStore.getState().completeFaint();
    }, wait);
    return () => window.clearTimeout(id);
  }, [blocking, startedAt]);

  useEffect(() => {
    if (!blocking || startedAt <= 0) return;
    let raf = 0;
    const reduce = prefersReducedMotion();
    const tick = () => {
      const el = dimRef.current;
      if (el) el.style.opacity = String(faintDimOpacity(startedAt, Date.now(), reduce));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [blocking, startedAt]);

  useEffect(() => {
    if (!blocking) return;
    const stop = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    for (const type of BLOCKED_EVENTS) document.addEventListener(type, stop, true);
    return () => {
      for (const type of BLOCKED_EVENTS) document.removeEventListener(type, stop, true);
    };
  }, [blocking]);

  if (!blocking) return null;

  return (
    <div
      ref={dimRef}
      className="fixed inset-0 z-[55]"
      style={{ background: "#15111c", opacity: 0, pointerEvents: "auto" }}
      aria-hidden="true"
      data-testid="faint-overlay"
    />
  );
}
