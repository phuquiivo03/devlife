"use client";

import { create } from "zustand";
import type { FloaterSpec, StatKey } from "./stat-fx";
import { STAT_FX } from "./stat-fx.config";

type LiveFloater = FloaterSpec & { id: number };
type FlashMark = { id: number; tone: "gain" | "loss" };

export const useStatFxStore = create<{
  floaters: LiveFloater[];
  flashes: Partial<Record<StatKey, FlashMark>>;
  push: (specs: FloaterSpec[]) => void;
  expire: (id: number) => void;
  clearFlash: (key: StatKey, id: number) => void;
  reset: () => void;
}>((set, get) => {
  let nextId = 1;
  return {
    floaters: [],
    flashes: {},
    push: (specs) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _now = Date.now();
      const incoming: LiveFloater[] = specs.map((s) => ({ ...s, id: nextId++ }));

      set((state) => {
        const merged = [...state.floaters];
        for (const f of incoming) {
          const existingCount = merged.filter((m) => m.key === f.key).length;
          if (existingCount >= STAT_FX.floatMaxPerStat) {
            const firstIdx = merged.findIndex((m) => m.key === f.key);
            if (firstIdx !== -1) merged.splice(firstIdx, 1);
          }
          merged.push(f);
        }

        const flashes: Partial<Record<StatKey, FlashMark>> = { ...state.flashes };
        for (const f of incoming) {
          if (f.tone !== "time") {
            flashes[f.key] = { id: incoming[incoming.length - 1].id, tone: f.tone as "gain" | "loss" };
          }
        }

        return { floaters: merged, flashes };
      });

      for (const f of incoming) {
        setTimeout(() => {
          get().expire(f.id);
        }, STAT_FX.floatMs + f.delayMs + 100);
      }

      for (const f of incoming) {
        setTimeout(() => {
          get().clearFlash(f.key, incoming[incoming.length - 1].id);
        }, STAT_FX.flashMs + 50);
      }
    },
    expire: (id) => {
      set((state) => ({
        floaters: state.floaters.filter((f) => f.id !== id),
      }));
    },
    clearFlash: (key, id) => {
      set((state) => {
        const mark = state.flashes[key];
        if (!mark || mark.id !== id) return state;
        const { [key]: _removed, ...rest } = state.flashes;
        return { flashes: rest };
      });
    },
    reset: () => {
      set({ floaters: [], flashes: {} });
    },
  };
});
