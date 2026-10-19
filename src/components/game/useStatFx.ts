"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/game/state/store";
import { sampleCareer, diffStats } from "./stat-fx";
import { useStatFxStore } from "./stat-fx-store";
import { STAT_FX } from "./stat-fx.config";

import { GameState } from "@/game/state/store";

export function useStatFx(active: boolean): void {
  const store = useGameStore();
  const push = useStatFxStore((s) => s.push);
  const reset = useStatFxStore((s) => s.reset);

  const prevSampleRef = useRef<ReturnType<typeof sampleCareer> | null>(null);
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<{ prev: ReturnType<typeof sampleCareer>; next: ReturnType<typeof sampleCareer> } | null>(null);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      reset();
      prevSampleRef.current = null;
      pendingRef.current = null;
      return;
    }

    const storeApi = useGameStore as unknown as { subscribe: (listener: (state: GameState, prev: GameState) => void) => () => void };
    const unsubscribe = storeApi.subscribe((state: GameState, prevState: GameState) => {
      if (!state._hasHydrated) return;

      const prevCareer = prevState?.career;
      const currCareer = state.career;

      if (!prevCareer || !currCareer) return;

      const prevSample = sampleCareer(prevCareer);
      const currSample = sampleCareer(currCareer);

      if (!prevSampleRef.current) {
        prevSampleRef.current = prevSample;
        return;
      }

      if (!pendingRef.current) {
        pendingRef.current = { prev: prevSampleRef.current, next: currSample };
      } else {
        pendingRef.current.next = currSample;
      }

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        const pending = pendingRef.current;
        if (!pending) return;

        const specs = diffStats(pending.prev, pending.next, STAT_FX);
        if (specs.length > 0) {
          push(specs);
        }

        pendingRef.current = null;
        prevSampleRef.current = pending.next;
        timerRef.current = null;
      }, STAT_FX.aggregateMs);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      reset();
    };
  }, [active, store, push, reset]);
}
