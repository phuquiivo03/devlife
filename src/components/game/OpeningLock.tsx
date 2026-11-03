"use client";

import { useEffect } from "react";
import { openingEscapeAllowed, openingLocksInput } from "@/game/opening/flow";
import { useGameStore } from "@/game/state/store";

const CONTROL = "button, a, input, select, textarea, [role='button'], [role='tab']";

function allowedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-opening-allow]")) return true;
  if (target.closest("canvas")) return true;
  return false;
}

/**
 * While the day-1 sequence is running, ignore every click except the
 * highlighted control and the buttons inside its panel. Camera drag stays:
 * pointer events on the WebGL canvas are left alone, and room-item use is
 * ignored in the store.
 */
export function OpeningLock() {
  const step = useGameStore((s) => (s.openingDone ? null : s.openingStep));

  useEffect(() => {
    if (step) document.documentElement.dataset.opening = step;
    else delete document.documentElement.dataset.opening;
    return () => {
      delete document.documentElement.dataset.opening;
    };
  }, [step]);

  useEffect(() => {
    if (!step) return;

    const onPointerDown = (event: Event) => {
      if (!openingLocksInput(useGameStore.getState().openingStep, useGameStore.getState().openingDone)) return;
      if (allowedTarget(event.target)) return;
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest(CONTROL)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const onClick = (event: Event) => {
      if (!openingLocksInput(useGameStore.getState().openingStep, useGameStore.getState().openingDone)) return;
      if (allowedTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const onKey = (event: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (!openingLocksInput(state.openingStep, state.openingDone)) return;
      if (event.key === "Escape" && openingEscapeAllowed(state)) return;
      if (allowedTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    document.addEventListener("contextmenu", onClick, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
      document.removeEventListener("contextmenu", onClick, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [step]);

  return null;
}
