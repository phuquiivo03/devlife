"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { STAGES, type StageId } from "@/game/config";
import { roomOwned } from "@/game/life/furniture";
import { getRoom } from "@/game/content";
import { useGameStore } from "@/game/state/store";
import { SceneCanvas } from "./SceneCanvas";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/locale";
import { cn } from "@/lib/utils";

type SidebarTab = "player" | "edit-room";

// three/R3F only enters the bundle when the ?3d=1 canvas actually renders.
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
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("player");
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  // 3D: measured room-frame height, mirrored into --shell-panel-h so the
  // sidebar's top and bottom edges align with the frame.
  const [panelHeightPx, setPanelHeightPx] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const debug = searchParams.get("debug") === "1";
  const is3d = searchParams.get("3d") === "1";
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

  useEffect(() => {
    if (customizeOpen) setSidebarTab("edit-room");
  }, [customizeOpen]);

  // Dev handle for driving poses/ownership from the console (see /debug).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __store: typeof useGameStore }).__store = useGameStore;
    }
  }, []);

  // 3D: track the room frame height so the sidebar can match it. Re-runs
  // once the shell actually renders (past loading/hydration gates).
  useEffect(() => {
    if (!is3d) return;
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
  }, [is3d, hydrated, assetsLoaded]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") setStage("student");
      if (e.key === "2") setStage("junior");
      if (e.key === "3") setStage("senior");
      if (e.key === "Escape") selectSlot(null);
      if (e.key === "c" || e.key === "C") {
        setSidebarTab("edit-room");
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

  // Show loading screen until assets are preloaded. The 3D theme wraps
  // even these gates so the lavender page bg is there from first paint.
  if (!assetsLoaded) {
    return (
      <div className={cn("min-h-screen", is3d && "theme-clay")}>
        <LoadingScreen onComplete={() => setAssetsLoaded(true)} />
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div
        className={cn(
          "flex min-h-screen items-center justify-center font-galmuri-11 text-galmuri-title text-[var(--foreground)]",
          is3d && "theme-clay",
        )}
      >
        Đang tải phòng của bạn…
      </div>
    );
  }

  // The scene card fills the left column; SceneCanvas reads the slot size.
  const roomAreaStyle = {
    width: "100%",
    minHeight: 280,
  };

  return (
    <div
      className={cn(
        "mx-auto flex min-h-screen w-full max-w-[1280px] flex-col lg:h-screen lg:max-h-screen lg:overflow-hidden",
        is3d && "theme-clay",
      )}
    >
      <header className="px-3 pt-3 lg:px-6 lg:pt-5">
        <TopBar iconFiles={iconFiles} clay={is3d} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5 lg:overflow-hidden lg:p-6 lg:pt-5">
        <main className="relative order-1 flex min-h-0 w-full flex-col lg:min-h-0 lg:overflow-y-auto">
          <SceneCard
            canvas={
              is3d ? (
                <Scene3DLazy debug={debug} />
              ) : (
                <SceneCanvas areaRef={areaRef} debug={debug} />
              )
            }
            areaRef={areaRef}
            roomAreaStyle={roomAreaStyle}
            bare={is3d}
            label={
              // 3D prod drops the room label; debug keeps it.
              is3d && !debug ? null : (
                <>
                  {t(room.title)}
                  {debug ? " · debug (D)" : ""}
                </>
              )
            }
          >
            <LifeRoomFx is3d={is3d} />
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
            is3d && panelHeightPx
              ? ({ "--shell-panel-h": `${panelHeightPx}px` } as CSSProperties)
              : undefined
          }
        >
          {is3d ? (
            /* 3D sidebar: ONE cream block aligned to the room frame —
               profile header straight on it, stats + actions as two ivory
               cards. Room editing takes the block over in place. */
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
          ) : (
            <>
              <Tabs
                value={sidebarTab}
                onValueChange={(v) => {
                  setSidebarTab(v as SidebarTab);
                  if (v === "edit-room") setCustomizeOpen(true);
                }}
                className="flex flex-none flex-col gap-4"
              >
                {showTimeDebug && (
                  <TabsList className="tabs-lavender grid h-11 w-full grid-cols-2">
                    <TabsTrigger
                      value="player"
                      className="border-0 font-galmuri-11 text-galmuri-title data-[state=active]:border-0"
                    >
                      Nhân vật
                    </TabsTrigger>
                    <TabsTrigger
                      value="edit-room"
                      className="border-0 font-galmuri-11 text-galmuri-title data-[state=active]:border-0"
                    >
                      Sửa phòng
                    </TabsTrigger>
                  </TabsList>
                )}
                <TabsContent value="player" className="mt-0 min-h-0">
                  <ProfileCard iconFiles={iconFiles} clay={is3d} />
                </TabsContent>
                <TabsContent
                  value="edit-room"
                  className="mt-0 min-h-0"
                >
                  <div className="flex max-h-[min(70vh,720px)] min-h-[320px] flex-col">
                    <CustomizePanel />
                  </div>
                </TabsContent>
              </Tabs>
              <StatsCard clay />
              <ActionsCard iconFiles={iconFiles} clay={is3d} />
            </>
          )}
          {/* 3D keeps the skills card out of the sidebar block (debug-only
              there) so the column never outgrows the room frame. */}
          {!is3d || debug ? <SkillsCard iconFiles={iconFiles} /> : null}
        </aside>
      </div>
      <CharacterIntro />
    </div>
  );
}
