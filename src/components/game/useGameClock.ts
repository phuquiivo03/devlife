"use client";

import { useEffect } from "react";
import { faintBlocksInput } from "@/game/life/faint";
import { useGameStore } from "@/game/state/store";
import { createTimeLoop, timeBus } from "@/game/time";

/** Drives the persisted clock. Starts only after the save has hydrated. */
export function useGameClock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const loop = createTimeLoop({
      getTotalMinutes: () => useGameStore.getState().totalMinutes,
      setTotalMinutes: (minutes) => useGameStore.getState().setTotalMinutes(minutes),
      getSpeed: () => useGameStore.getState().clockSpeed,
      isPaused: () => {
        const state = useGameStore.getState();
        return state.clockPaused || state.career.feed?.pendingId != null || faintBlocksInput(state.faint);
      },
      emit: (event) => timeBus.emit(event),
    });

    let raf = 0;
    const frame = (now: number) => {
      loop.tick(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame((now) => {
      loop.start(now);
      raf = requestAnimationFrame(frame);
    });

    const flush = () => {
      loop.tick(performance.now());
      loop.commit();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [active]);
}
