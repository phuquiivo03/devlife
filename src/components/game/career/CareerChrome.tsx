"use client";

import { useEffect, useRef, useState } from "react";
import { playCueKey } from "@/game/audio/client";
import { SIM_CATALOG } from "@/game/career/content";
import { gameBus } from "@/game/events/bus";
import type { GameEvent } from "@/game/events/types";
import { useGameStore } from "@/game/state/store";
import { timeBus } from "@/game/time";
import { formatVnd } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";
import { PanelCard, PanelCardTitle } from "@/components/ui/panel-card";
import { JobManageBoard } from "./JobManageBoard";
import { RankBadge } from "./RankBadge";
import { SkillRankPanel } from "./SkillRankPanel";
import { StudyPanel } from "./StudyPanel";

type FloatNote = { id: number; label: string };
type LevelPopup = { skillId: string; level: number; rankId: string };

let floatSeq = 0;

function useCareerSim() {
  useEffect(() => {
    useGameStore.getState().ensureTodayBoard();
    const offDay = timeBus.on("dayStarted", (event) => {
      useGameStore.getState().onDayStarted(event.day, event.totalMinutes);
    });
    const offHour = timeBus.on("hourChanged", (event) => {
      useGameStore.getState().onHour(event.hour, event.totalMinutes);
    });
    const offSleep = timeBus.on("sleep", (event) => {
      useGameStore.getState().onWake(event.fromTotalMinutes);
    });
    return () => {
      offDay();
      offHour();
      offSleep();
    };
  }, []);
}

export function CareerChrome({
  iconFiles,
  showDebug,
}: {
  iconFiles: readonly string[];
  showDebug: boolean;
}) {
  useCareerSim();
  const panel = useGameStore((s) => s.careerPanel);
  const close = useGameStore((s) => s.closeCareerPanel);
  const debugAddMoney = useGameStore((s) => s.debugAddMoney);
  const debugFillEnergy = useGameStore((s) => s.debugFillEnergy);
  const debugLevelUp = useGameStore((s) => s.debugLevelUp);
  const [floats, setFloats] = useState<FloatNote[]>([]);
  const [popup, setPopup] = useState<LevelPopup | null>(null);

  useEffect(() => {
    const push = (label: string) => {
      playCueKey("toast");
      floatSeq += 1;
      const id = floatSeq;
      setFloats((current) => [...current, { id, label }]);
      window.setTimeout(() => {
        setFloats((current) => current.filter((note) => note.id !== id));
      }, 1000);
    };
    const offXp = gameBus.on("skillXpGained", (event) => {
      if (event.amount > 0) push(`+${event.amount} XP`);
    });
    const offMoney = gameBus.on("moneyChanged", (event) => {
      if (event.delta === 0) return;
      push(event.delta > 0 ? `+${formatVnd(event.delta)}` : formatVnd(event.delta));
    });
    const offLevel = gameBus.on("skillLevelUp", (event: GameEvent & { type: "skillLevelUp" }) => {
      playCueKey("toast");
      setPopup({ skillId: event.skillId, level: event.level, rankId: event.rankId });
    });
    return () => {
      offXp();
      offMoney();
      offLevel();
    };
  }, []);

  useEffect(() => {
    if (!popup) return;
    const timer = window.setTimeout(() => setPopup(null), 6000);
    return () => window.clearTimeout(timer);
  }, [popup]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, close]);

  const panelRef = useRef(panel);
  useEffect(() => {
    const previous = panelRef.current;
    panelRef.current = panel;
    if (panel && panel !== previous) playCueKey("panelOpen");
    if (!panel && previous) playCueKey("panelClose");
  }, [panel]);

  const title = panel === "study" ? "Khóa học" : panel === "skills" ? "Kỹ năng" : "";
  const popupSkill = SIM_CATALOG.skills.find((row) => row.id === popup?.skillId);

  return (
    <>
      {showDebug ? (
        <div className="w-full max-w-[520px]" data-testid="career-debug">
          <PanelCard className="p-3">
            <p className="mb-2 font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
              Kỹ năng (debug)
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" showArrow={false} variant="outline" onClick={debugAddMoney}>
                Thêm tiền
              </Button>
              <Button
                type="button"
                size="sm"
                showArrow={false}
                variant="outline"
                onClick={debugFillEnergy}
              >
                Đầy năng lượng
              </Button>
              <Button
                type="button"
                size="sm"
                showArrow={false}
                data-testid="debug-level-up"
                onClick={debugLevelUp}
              >
                Lên cấp Frontend
              </Button>
            </div>
          </PanelCard>
        </div>
      ) : null}

      {floats.length > 0 ? (
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-1">
          {floats.map((note) => (
            <span
              key={note.id}
              data-testid="float-gain"
              className="float-gain font-galmuri-11 text-galmuri-title text-[var(--accent-violet)]"
            >
              {note.label}
            </span>
          ))}
        </div>
      ) : null}

      {panel === "jobs" ? <JobManageBoard open onOpenChange={(next) => { if (!next) close(); }} /> : null}

      {panel && panel !== "jobs" ? (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[#2A2548]/40 p-4"
          onClick={close}
        >
          <div
            className="mt-8 w-full max-w-[560px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="career-panel-title"
            data-testid="career-panel"
            data-panel={panel}
            onClick={(event) => event.stopPropagation()}
          >
            <PanelCard className="max-h-[80vh] overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <PanelCardTitle>
                  <span id="career-panel-title">{title}</span>
                </PanelCardTitle>
                <Button type="button" size="sm" showArrow={false} variant="outline" onClick={close}>
                  Đóng
                </Button>
              </div>
              {panel === "study" ? <StudyPanel iconFiles={iconFiles} /> : null}
              {panel === "skills" ? <SkillRankPanel iconFiles={iconFiles} /> : null}
            </PanelCard>
          </div>
        </div>
      ) : null}

      {popup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A2548]/45 p-4"
          data-testid="level-up-popup"
          role="dialog"
          aria-modal="true"
          aria-label="Lên cấp"
        >
          <PanelCard className="w-full max-w-sm p-5 text-center">
            <p className="font-galmuri-11 text-galmuri-title text-[var(--foreground)]">Lên cấp</p>
            <div className="my-3 flex justify-center">
              <span className="badge-bounce inline-flex">
                <RankBadge rankId={popup.rankId} />
              </span>
            </div>
            <p className="mb-3 font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
              {popupSkill?.name ?? popup.skillId} · cấp {popup.level}
            </p>
            <Button type="button" size="sm" showArrow={false} onClick={() => setPopup(null)}>
              Đóng
            </Button>
          </PanelCard>
        </div>
      ) : null}
    </>
  );
}
