"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { STAGES, type StageId } from "@/game/config";
import { roomOwned } from "@/game/life/furniture";
import { getRoom } from "@/game/content";
import { useGameStore } from "@/game/state/store";
import { LifeRoomFx, LifeStage } from "./LifeStage";
import { LifeEventPopup } from "./LifeEventPopup";
import { CharacterIntro } from "./CharacterIntro";
import { CustomizePanel } from "./CustomizePanel";
import { TopBar, StatsCard, ActionsCard } from "./PlayerHudCard";
import { ProfileCard, SkillsCard } from "./PlayerInfoPanel";
import { TaskRunOverlay } from "@/components/terminal/TaskRunOverlay";
import { SceneCard } from "./SceneCard";
import { TimeDebugPanel } from "./TimeDebugPanel";
import { CareerChrome } from "./career/CareerChrome";
import { StoreModal } from "./StoreModal";
import { AudioPopup } from "./AudioPopup";
import { NotificationsPopup } from "./NotificationsPopup";
import { HospitalPopup } from "./HospitalPopup";
import { LoadingScreen } from "./LoadingScreen";
import { SleepTransition } from "./SleepTransition";
import { useGameClock } from "./useGameClock";
import { useGameAudio } from "./useGameAudio";
import { useStatFx } from "./useStatFx";
import { t } from "@/lib/locale";

// three/R3F ships in its own client-only chunk so SSR and first paint stay light.
const Scene3DLazy = dynamic(() => import("@/game3d/Scene3D"), {
  ssr: false,
  loading: () => null,
});

export function GameShell({
  iconFiles = [],
}: {
  iconFiles?: readonly string[];
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  // Measured room-frame height, mirrored into --shell-panel-h so the
  // sidebar's top and bottom edges align with the frame.
  const [panelHeightPx, setPanelHeightPx] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const debug = searchParams.get("debug") === "1";
  const showTimeDebug = debug || process.env.NODE_ENV !== "production";

  const stage = useGameStore((s) => s.stage);
  const setStage = useGameStore((s) => s.setStage);
  const juniorOpen = useGameStore((s) => roomOwned(s.career, "junior"));
  const seniorOpen = useGameStore((s) => roomOwned(s.career, "senior"));
  const hydrated = useGameStore((s) => s._hasHydrated);
  useGameClock(hydrated && assetsLoaded);
  useGameAudio();
  useStatFx(hydrated && assetsLoaded); // useStatFx(hydrated)
  const showCharacter = useGameStore((s) => s.showCharacter);
  const setShowCharacter = useGameStore((s) => s.setShowCharacter);
  const hospitalOpen = useGameStore((s) => s.hospitalOpen);
  const hospitalCost = useGameStore((s) => s.hospitalCost);
  const dischargeFromHospital = useGameStore((s) => s.dischargeFromHospital);
  const resetStage = useGameStore((s) => s.resetStage);
  const customizeOpen = useGameStore((s) => s.customizeOpen);
  const setCustomizeOpen = useGameStore((s) => s.setCustomizeOpen);
  const selectedSlot = useGameStore((s) => s.selectedSlot);
  const cycleVariant = useGameStore((s) => s.cycleVariant);
  const selectSlot = useGameStore((s) => s.selectSlot);

  useEffect(() => {
    const q = searchParams.get("stage") as StageId | null;
    if (q && STAGES.includes(q)) setStage(q);
  }, [searchParams, setStage]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("stage", stage);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [stage, router, searchParams]);

  // Dev handle for driving the store from the console.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __store: typeof useGameStore }).__store = useGameStore;
    }
  }, []);

  // Track the room frame height so the sidebar can match it. Re-runs
  // once the shell actually renders (past loading/hydration gates).
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => setPanelHeightPx(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [hydrated, assetsLoaded]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") setStage("student");
      if (e.key === "2") setStage("junior");
      if (e.key === "3") setStage("senior");
      if (e.key === "Escape") selectSlot(null);
      if (e.key === "c" || e.key === "C") {
        setCustomizeOpen(true);
      }
      if (e.key === "d" || e.key === "D") {
        const params = new URLSearchParams(searchParams.toString());
        if (debug) params.delete("debug");
        else params.set("debug", "1");
        router.replace(`?${params.toString()}`);
      }
      if (selectedSlot && (e.key === "[" || e.key === "]")) {
        cycleVariant(selectedSlot, e.key === "]" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    setStage,
    selectSlot,
    setCustomizeOpen,
    selectedSlot,
    cycleVariant,
    debug,
    router,
    searchParams,
  ]);

  const room = getRoom(stage);

  // Show loading screen until assets are preloaded. The clay theme wraps
  // even these gates so the lavender page bg is there from first paint.
  if (!assetsLoaded) {
    return (
      <div className="min-h-screen theme-clay">
        <LoadingScreen onComplete={() => setAssetsLoaded(true)} />
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center font-galmuri-11 text-galmuri-title text-[var(--foreground)] theme-clay">
        Đang tải phòng của bạn…
      </div>
    );
  }

  // The scene card fills the left column; the 3D canvas sizes to the slot.
  const roomAreaStyle = {
    width: "100%",
    minHeight: 280,
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col theme-clay lg:h-screen lg:max-h-screen lg:overflow-hidden">
      <header className="px-3 pt-3 lg:px-6 lg:pt-5">
        <TopBar iconFiles={iconFiles} clay />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5 lg:overflow-hidden lg:p-6 lg:pt-5">
        <main className="relative order-1 flex min-h-0 w-full flex-col lg:min-h-0 lg:overflow-y-auto">
          <SceneCard
            canvas={<Scene3DLazy debug={debug} />}
            areaRef={areaRef}
            roomAreaStyle={roomAreaStyle}
            label={
              // Prod drops the room label; debug keeps it.
              debug ? `${t(room.title)} · debug (D)` : null
            }
          >
            <LifeRoomFx />
            <LifeEventPopup />
            <SleepTransition />
          </SceneCard>
          <div className="mt-3 flex w-full flex-col items-center gap-3">
            {showTimeDebug ? <TimeDebugPanel /> : null}
            <CareerChrome iconFiles={iconFiles} showDebug={showTimeDebug} />
            <StoreModal />
            <AudioPopup iconFiles={iconFiles} />
            <NotificationsPopup />
            <HospitalPopup
              open={hospitalOpen}
              hospitalCost={hospitalCost}
              onDischarge={dischargeFromHospital}
            />
          </div>
          <LifeStage />
          <TaskRunOverlay />
        </main>

        <aside
          className="order-2 flex min-h-0 w-full flex-col gap-4 lg:overflow-y-auto"
          data-side-panel="player"
          style={
            panelHeightPx
              ? ({ "--shell-panel-h": `${panelHeightPx}px` } as CSSProperties)
              : undefined
          }
        >
          {/* ONE cream block aligned to the room frame — profile header
              straight on it, stats + actions as two ivory cards. Room
              editing takes the block over in place. */}
          <div className="clay-side-block w-full">
            {customizeOpen ? (
              <CustomizePanel />
            ) : (
              <>
                <ProfileCard iconFiles={iconFiles} clay />
                <StatsCard clay embedded />
                <ActionsCard iconFiles={iconFiles} clay />
              </>
            )}
          </div>
          {/* Skills stay out of the sidebar block (debug-only) so the column
              never outgrows the room frame. */}
          {debug ? <SkillsCard iconFiles={iconFiles} /> : null}
        </aside>
      </div>
      <CharacterIntro />
    </div>
  );
}
