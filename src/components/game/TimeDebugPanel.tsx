"use client";

import { useGameStore } from "@/game/state/store";
import { PHASES, SPEED_PRESETS, snapshot } from "@/game/time";
import { Button } from "@/components/ui/button";
import { PanelCard } from "@/components/ui/panel-card";

/** Dev-only clock controls. Shown in development or with `?debug=1`. */
export function TimeDebugPanel() {
  const speed = useGameStore((s) => s.clockSpeed);
  const paused = useGameStore((s) => s.clockPaused);
  const setSpeed = useGameStore((s) => s.setClockSpeed);
  const setPaused = useGameStore((s) => s.setClockPaused);
  const jumpToPhase = useGameStore((s) => s.jumpToPhase);
  const debugForceEvent = useGameStore((s) => s.debugForceEvent);
  const debugSkipDay = useGameStore((s) => s.debugSkipDay);
  const phaseId = useGameStore((s) => snapshot(s.totalMinutes).phaseId);

  return (
    <div className="w-full max-w-[520px]" data-testid="time-debug">
      <PanelCard className="p-3">
        <p className="mb-2 font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
          Thời gian (debug)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-galmuri-7 text-galmuri-small text-[var(--foreground)]">
            Tốc độ
          </span>
          {SPEED_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              showArrow={false}
              variant={speed === preset ? "default" : "outline"}
              aria-pressed={speed === preset}
              onClick={() => setSpeed(preset)}
            >
              x{preset}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            showArrow={false}
            variant={paused ? "default" : "outline"}
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
          >
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-galmuri-7 text-galmuri-small text-[var(--foreground)]">
            Nhảy pha
          </span>
          <Button
            type="button"
            size="sm"
            showArrow={false}
            variant="outline"
            data-testid="debug-force-event"
            onClick={debugForceEvent}
          >
            Sự kiện
          </Button>
          <Button
            type="button"
            size="sm"
            showArrow={false}
            variant="outline"
            data-testid="debug-skip-day"
            onClick={debugSkipDay}
          >
            Bỏ qua 1 ngày
          </Button>
          {PHASES.map((phase) => (
            <Button
              key={phase.id}
              type="button"
              size="sm"
              showArrow={false}
              variant={phaseId === phase.id ? "default" : "outline"}
              aria-pressed={phaseId === phase.id}
              onClick={() => jumpToPhase(phase.id)}
            >
              {phase.label}
            </Button>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
