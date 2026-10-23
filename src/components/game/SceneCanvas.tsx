"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WORLD } from "@/game/config";
import { getCatalog, getRoom } from "@/game/content";
import { resolveScene } from "@/game/layout/resolveScene";
import { sortDrawEntries } from "@/game/layout/sort";
import { replacedItemIds, storeDrawEntries } from "@/game/life/placement";
import { loadAtlas, type LoadedAtlas } from "@/game/render/atlas";
import {
  canvasCssWithinFrame,
  chamferScale,
  FRAME_PAD_PER_SIDE,
} from "@/lib/chamfer-frame";
import { createRenderer } from "@/game/render/canvasRenderer";
import { hitTestEntries } from "@/game/render/hitTest";
import { computeView } from "@/game/view/computeView";
import { focusCameraX } from "@/game/view/camera";
import { buildSlotIndex, useGameStore } from "@/game/state/store";
import {
  phaseById,
  snapshot,
  TINT_TRANSITION_MS,
  type PhaseTint,
} from "@/game/time";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@/lib/locale";

type Props = {
  areaRef: React.RefObject<HTMLDivElement | null>;
  debug?: boolean;
};

export function SceneCanvas({ areaRef, debug = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);
  const atlasRef = useRef<LoadedAtlas | null>(null);
  const entriesRef = useRef<ReturnType<typeof resolveScene>["entries"]>([]);
  const [atlasReady, setAtlasReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ x: number; cam: number } | null>(null);

  const stage = useGameStore((s) => s.stage);
  const owned = useGameStore((s) => s.career.shop?.owned);
  const loadout = useGameStore((s) => s.loadouts[stage]);
  const showCharacter = useGameStore((s) => s.showCharacter);
  const selectedSlot = useGameStore((s) => s.selectedSlot);
  const hoveredSlot = useGameStore((s) => s.hoveredSlot);
  const cameraXStore = useGameStore((s) => s.cameraX[stage]);
  const setHover = useGameStore((s) => s.setHover);
  const selectSlot = useGameStore((s) => s.selectSlot);
  const setCameraX = useGameStore((s) => s.setCameraX);
  const setCustomizeOpen = useGameStore((s) => s.setCustomizeOpen);
  const phaseId = useGameStore((s) => snapshot(s.totalMinutes).phaseId);

  const room = useMemo(() => getRoom(stage), [stage]);
  const catalog = useMemo(() => getCatalog(), []);
  const slotIndex = useMemo(() => buildSlotIndex(stage), [stage]);

  const scene = useMemo(() => {
    if (!atlasRef.current) return null;
    const ownedIds = owned ?? [];
    const resolved = resolveScene(
      room,
      catalog,
      loadout,
      atlasRef.current.frameLookup,
      {
        showCharacter,
        slotIndex,
        suppressItemIds: replacedItemIds(stage, ownedIds),
      },
    );
    const desk = resolved.placements.find(
      (placement) => placement.slotId === "desk",
    );
    return {
      entries: sortDrawEntries([
        ...resolved.entries,
        ...storeDrawEntries(stage, ownedIds, desk?.baseline ?? null),
      ]),
      placements: resolved.placements,
    };
  }, [
    room,
    catalog,
    loadout,
    showCharacter,
    slotIndex,
    atlasReady,
    stage,
    owned,
  ]);

  useEffect(() => {
    let cancelled = false;
    loadAtlas()
      .then((a) => {
        if (cancelled) return;
        atlasRef.current = a;
        setAtlasReady(true);
      })
      .catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const atlas = atlasRef.current;
    if (!canvas || !atlas) return;
    if (!rendererRef.current) {
      const renderer = createRenderer(canvas, atlas);
      renderer.setTint(
        phaseById(snapshot(useGameStore.getState().totalMinutes).phaseId).tint,
      );
      rendererRef.current = renderer;
    }
  }, [atlasReady]);

  useEffect(() => {
    if (!scene || !rendererRef.current) return;
    entriesRef.current = scene.entries;
    rendererRef.current.setScene(
      scene.entries,
      `/assets/${room.background}.png`,
    );
    if (debug) {
      rendererRef.current.setDebug({
        placements: scene.placements.map((p) => ({
          anchor: p.anchor,
          baseline: p.baseline,
        })),
        bounds: room.bounds,
      });
    }
  }, [scene, room.background, debug]);

  useEffect(() => {
    const highlight = hoveredSlot ?? selectedSlot;
    rendererRef.current?.setHighlight(highlight);
  }, [hoveredSlot, selectedSlot]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    if (!renderer) return;
    if (canvas) canvas.dataset.phase = phaseId;
    const target = phaseById(phaseId).tint;
    const from = renderer.getTint();
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!from || reduce || tintsClose(from, target)) {
      renderer.setTint(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / TINT_TRANSITION_MS);
      const eased = t * t * (3 - 2 * t);
      renderer.setTint(lerpTint(from, target, eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phaseId, atlasReady]);

  useEffect(() => {
    const el = areaRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas || !rendererRef.current) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const portrait = rect.height > rect.width;
      const cam =
        cameraXStore ??
        (selectedSlot
          ? (() => {
              const p = scene?.placements.find(
                (x) => x.slotId === selectedSlot,
              );
              return p ? focusCameraX(p.anchor[0], 200) : null;
            })()
          : null);
      const scale = chamferScale(rect.width);
      const inset = FRAME_PAD_PER_SIDE * scale;
      const expectedSlotH = Math.round(
        ((rect.width - inset * 2) * WORLD.h) / WORLD.w + inset * 2,
      );
      const slotH = Math.max(rect.height, expectedSlotH);
      const view = computeView({
        areaCssW: rect.width,
        areaCssH: slotH,
        dpr,
        portrait,
        focusX: room.focusX,
        cameraX: cam,
      });
      const fitted = canvasCssWithinFrame(
        view.cssW,
        view.cssH,
        rect.width,
        slotH,
      );
      rendererRef.current?.setView({
        ...view,
        cssW: fitted.cssW,
        cssH: fitted.cssH,
      });
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    const mq = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`,
    );
    const onMq = () => update();
    mq.addEventListener?.("change", onMq);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      mq.removeEventListener?.("change", onMq);
      window.removeEventListener("resize", update);
    };
  }, [areaRef, room.focusX, cameraXStore, selectedSlot, scene, stage]);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const el = areaRef.current;
      if (!canvas || !el) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const dpr = window.devicePixelRatio || 1;
      const view = computeView({
        areaCssW: el.getBoundingClientRect().width,
        areaCssH: el.getBoundingClientRect().height,
        dpr,
        portrait:
          el.getBoundingClientRect().height > el.getBoundingClientRect().width,
        focusX: room.focusX,
        cameraX: cameraXStore,
      });
      const x =
        ((clientX - rect.left) / rect.width) * view.viewW + view.cameraX;
      const y = ((clientY - rect.top) / rect.height) * view.viewH;
      return { x: Math.floor(x), y: Math.floor(y) };
    },
    [areaRef, room.focusX, cameraXStore],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    const el = areaRef.current;
    if (!el) return;
    const portrait =
      el.getBoundingClientRect().height > el.getBoundingClientRect().width;
    if (portrait) {
      dragRef.current = {
        x: e.clientX,
        cam: cameraXStore ?? focusCameraX(room.focusX, 200),
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const atlas = atlasRef.current;
    if (!atlas) return;
    if (dragRef.current && e.buttons === 1) {
      const canvas = canvasRef.current;
      const el = areaRef.current;
      if (!canvas || !el) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const area = el.getBoundingClientRect();
      const shown = computeView({
        areaCssW: area.width,
        areaCssH: area.height,
        dpr,
        portrait: true,
        focusX: room.focusX,
        cameraX: dragRef.current.cam,
      });
      const worldPerPx = rect.width > 0 ? shown.viewW / rect.width : 1;
      const dx = (e.clientX - dragRef.current.x) * worldPerPx;
      const view = computeView({
        areaCssW: area.width,
        areaCssH: area.height,
        dpr,
        portrait: true,
        focusX: room.focusX,
        cameraX: dragRef.current.cam - dx,
      });
      setCameraX(stage, view.cameraX);
      return;
    }
    const w = toWorld(e.clientX, e.clientY);
    if (!w) return;
    const slot = hitTestEntries(
      entriesRef.current,
      w.x,
      w.y,
      atlas.getFrame,
      atlas.alphaBySprite,
    );
    setHover(slot);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onClick = (e: React.MouseEvent) => {
    const atlas = atlasRef.current;
    if (!atlas) return;
    const w = toWorld(e.clientX, e.clientY);
    if (!w) return;
    const slot = hitTestEntries(
      entriesRef.current,
      w.x,
      w.y,
      atlas.getFrame,
      atlas.alphaBySprite,
    );
    if (slot) {
      selectSlot(slot);
      setCustomizeOpen(true);
    }
  };

  const pan = (dir: -1 | 1) => {
    const el = areaRef.current;
    if (!el) return;
    const dpr = window.devicePixelRatio || 1;
    const view = computeView({
      areaCssW: el.getBoundingClientRect().width,
      areaCssH: el.getBoundingClientRect().height,
      dpr,
      portrait: true,
      focusX: room.focusX,
      cameraX: (cameraXStore ?? focusCameraX(room.focusX, 200)) + dir * 24,
    });
    setCameraX(stage, view.cameraX);
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Không tải được đồ họa phòng. {error}
      </div>
    );
  }

  const portrait =
    areaRef.current &&
    areaRef.current.getBoundingClientRect().height >
      areaRef.current.getBoundingClientRect().width;

  return (
    <div className="relative flex w-max items-center justify-center">
      {portrait && (
        <>
          {/* <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute left-1 top-1/2 z-10 -translate-y-1/2 bg-[var(--panel-bg)]/95"
            onClick={() => pan(-1)}
            aria-label="Kéo sang trái"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 bg-[var(--panel-bg)]/95"
            onClick={() => pan(1)}
            aria-label="Kéo sang phải"
          >
            <ChevronRight className="h-4 w-4" />
          </Button> */}
        </>
      )}
      <canvas
        ref={canvasRef}
        className="pixelated max-h-full max-w-full transition-opacity duration-120"
        role="img"
        aria-label={`Cảnh ${t(room.title)}, ${phaseById(phaseId).label}`}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onClick={onClick}
      />
    </div>
  );
}

function lerpTint(from: PhaseTint, to: PhaseTint, t: number): PhaseTint {
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
    a: from.a + (to.a - from.a) * t,
  };
}

function tintsClose(a: PhaseTint, b: PhaseTint): boolean {
  return (
    Math.abs(a.r - b.r) < 0.5 &&
    Math.abs(a.g - b.g) < 0.5 &&
    Math.abs(a.b - b.b) < 0.5 &&
    Math.abs(a.a - b.a) < 0.01
  );
}
