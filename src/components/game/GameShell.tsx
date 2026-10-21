"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Backpack, Coffee, Monitor } from "lucide-react";
import { STAGES, type StageId } from "@/game/config";
import { roomOwned } from "@/game/life/furniture";
import { getRoom } from "@/game/content";
import { useGameStore } from "@/game/state/store";
import { SceneCanvas } from "./SceneCanvas";
import { LifeRoomFx, LifeStage } from "./LifeStage";
import { LifeEventPopup } from "./LifeEventPopup";
import { CharacterIntro } from "./CharacterIntro";
import { CustomizePanel } from "./CustomizePanel";
import { NotificationsPanel } from "./NotificationsPanel";
import { PlayerInfoPanel } from "./PlayerInfoPanel";
import { PlayerHudCard, RoomStatusBar } from "./PlayerHudCard";
import { TaskRunOverlay } from "@/components/terminal/TaskRunOverlay";
import { PanelChamferFrame } from "./PanelChamferFrame";
import { RoomChamferFrame } from "./RoomChamferFrame";
import { TimeDebugPanel } from "./TimeDebugPanel";
import { CareerChrome } from "./career/CareerChrome";
import { StoreModal } from "./StoreModal";
import { HospitalPopup } from "./HospitalPopup";
import { LoadingScreen } from "./LoadingScreen";
import { SleepTransition } from "./SleepTransition";
import { useGameClock } from "./useGameClock";
import { useGameAudio } from "./useGameAudio";
import { useStatFx } from "./useStatFx";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/locale";
import { STAGE_LABELS } from "@/lib/stage-labels";
import { cn } from "@/lib/utils";
import { ROOM_VIEWPORT_W, shellPanelVars } from "./shell-layout.config";
import shellStyles from "./shell-layout.module.css";

const stageIcons: Record<StageId, React.ReactNode> = {
  student: <Backpack className="h-4 w-4" strokeWidth={2} />,
  junior: <Monitor className="h-4 w-4" strokeWidth={2} />,
  senior: <Coffee className="h-4 w-4" strokeWidth={2} />,
};

type SidebarTab = "player" | "edit-room";

export function GameShell({
  iconFiles = [],
}: {
  iconFiles?: readonly string[];
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("player");
  const [assetsLoaded, setAssetsLoaded] = useState(false);
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
  useStatFx(hydrated && assetsLoaded);
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
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (customizeOpen) setSidebarTab("edit-room");
  }, [customizeOpen]);

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

  // Show loading screen until assets are preloaded
  if (!assetsLoaded) {
    return <LoadingScreen onComplete={() => setAssetsLoaded(true)} />;
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center font-galmuri-11 text-galmuri-title text-white">
        Đang tải phòng của bạn…
      </div>
    );
  }

  const roomAreaStyle = isDesktop
    ? {
        width: ROOM_VIEWPORT_W,
        maxWidth: "100%",
        minHeight: Math.round((ROOM_VIEWPORT_W * 240) / 427),
      }
    : {
        width: "100%",
        maxWidth: ROOM_VIEWPORT_W,
        minHeight: 200,
        aspectRatio: "427 / 240",
      };

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:max-h-screen lg:overflow-hidden">
      <header className="relative z-10 flex min-h-14 justify-between shrink-0 items-center gap-3 border-b border-white/15 bg-[var(--panel-bg)]/90 px-3 backdrop-blur-sm md:px-4">
        <span className="font-galmuri-11 text-galmuri-title-lg text-[var(--foreground)]">
          devlife
        </span>

        {showTimeDebug && (
          <div className="flex shrink-0 items-center gap-2">
            <label className="hidden min-h-10 items-center gap-2 sm:flex">
              <Label className="font-galmuri-9 text-galmuri-body">
                Nhân vật
              </Label>
              <Switch
                checked={showCharacter}
                onCheckedChange={setShowCharacter}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              showArrow={false}
              onClick={resetStage}
            >
              Đặt lại phòng
            </Button>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:items-center lg:justify-[safe_center] lg:px-4 lg:py-6">
        <div
          className="relative flex min-h-0 w-full flex-1 flex-col lg:grid lg:w-full lg:max-w-[1200px] lg:flex-none lg:grid-cols-[320px_minmax(0,1fr)_320px] lg:items-stretch lg:gap-5"
          style={shellPanelVars()}
        >
          <aside
            className={cn(
              "order-2 flex min-h-0 flex-col p-3 lg:order-1 lg:p-0",
              shellStyles.column,
            )}
            data-side-panel="notices"
          >
            <PanelChamferFrame>
              <NotificationsPanel />
            </PanelChamferFrame>
          </aside>

          <main className="relative order-1 flex min-h-0 flex-col items-center justify-center px-2 py-4 lg:order-2 lg:justify-start lg:px-0 lg:py-0">
            <div className="room-stage-glow flex w-full flex-col items-center">
              <RoomStatusBar iconFiles={iconFiles} />
              <RoomChamferFrame
                areaRef={areaRef}
                roomAreaStyle={roomAreaStyle}
                label={
                  <>
                    {t(room.title)}
                    {debug ? " · debug (D)" : ""}
                  </>
                }
              >
                <SceneCanvas areaRef={areaRef} debug={debug} />
                <LifeRoomFx />
                <LifeEventPopup />
                <SleepTransition />
              </RoomChamferFrame>
              <div className="mt-3 flex w-full flex-col items-center gap-3 px-2 lg:px-0">
                <PlayerHudCard iconFiles={iconFiles} />
                {showTimeDebug ? <TimeDebugPanel /> : null}
                <CareerChrome iconFiles={iconFiles} showDebug={showTimeDebug} />
                <StoreModal />
                <HospitalPopup
                  open={hospitalOpen}
                  hospitalCost={hospitalCost}
                  onDischarge={dischargeFromHospital}
                />
              </div>
            </div>
            <LifeStage />
            <TaskRunOverlay />
          </main>

          <aside
            className={cn(
              "order-3 flex min-h-0 flex-col p-3 lg:p-0",
              shellStyles.column,
            )}
            data-side-panel="player"
          >
            <PanelChamferFrame>
              <Tabs
                value={sidebarTab}
                onValueChange={(v) => {
                  setSidebarTab(v as SidebarTab);
                  if (v === "edit-room") setCustomizeOpen(true);
                }}
                className="flex h-full min-h-0 flex-1 flex-col gap-3 p-3"
              >
                <TabsList className="tabs-lavender grid h-11 w-full grid-cols-2">
                  <TabsTrigger
                    value="player"
                    className="border-0 font-galmuri-11 text-galmuri-title data-[state=active]:border-0"
                  >
                    Nhân vật
                  </TabsTrigger>
                  {showTimeDebug && (
                    <TabsTrigger
                      value="edit-room"
                      className="border-0 font-galmuri-11 text-galmuri-title data-[state=active]:border-0"
                    >
                      Sửa phòng
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent
                  value="player"
                  className="mt-0 min-h-0 flex-1 overflow-hidden"
                >
                  <PlayerInfoPanel iconFiles={iconFiles} />
                </TabsContent>
                <TabsContent
                  value="edit-room"
                  className="mt-0 min-h-0 flex-1 overflow-hidden"
                >
                  <div className="flex max-h-[min(50vh,520px)] min-h-[240px] flex-col lg:h-full lg:max-h-full lg:min-h-0">
                    <CustomizePanel />
                  </div>
                </TabsContent>
              </Tabs>
            </PanelChamferFrame>
          </aside>
        </div>
      </div>
      <CharacterIntro />
    </div>
  );
}
