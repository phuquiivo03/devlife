"use client";

import {
  FULLTIME,
  STACK_LABEL,
  TIER_LABEL,
  baseSalaryOf,
  boardPositionsOf,
  chanceLabel,
  employmentOf,
  fitFor,
  missingRequirementLines,
  passChanceFor,
  pendingApplications,
  positionById,
  positionRequirementLines,
  weekStartOf,
} from "@/game/jobs/fulltime";
import { useGameStore } from "@/game/state/store";
import { snapshot } from "@/game/time";
import { formatVnd } from "@/lib/format-currency";
import { PixelButton } from "@/components/ui/button";
import { BlockedButton } from "./BlockedButton";

/**
 * Tab Tuyển dụng: the weekly position board (4–6 spots, rerolled each Monday)
 * plus the applications still waiting for a result.
 */
export function RecruitPanel() {
  const career = useGameStore((s) => s.career);
  const day = useGameStore((s) => snapshot(s.totalMinutes).day);
  const applyToPosition = useGameStore((s) => s.applyToPosition);

  const employment = employmentOf(career);
  const board = boardPositionsOf(employment);
  const week = weekStartOf(day);
  const appliedThisWeek = new Set(
    employment.applications.filter((row) => row.weekStart === week).map((row) => row.positionId),
  );
  const waiting = pendingApplications(employment);

  const blockReason = (positionId: string, company: string): string | null => {
    const blockedUntil = employment.blockedCompanies[company];
    if (blockedUntil != null && blockedUntil > day) {
      return `${company} chưa nhận hồ sơ (còn ${blockedUntil - day} ngày)`;
    }
    if (appliedThisWeek.has(positionId)) return "Đã nộp đơn tuần này";
    if (waiting.length >= FULLTIME.apply_max_pending) {
      return `Tối đa ${FULLTIME.apply_max_pending} đơn đang chờ`;
    }
    if (career.players.energy < FULLTIME.apply_energy) {
      return `Cần ${FULLTIME.apply_energy} năng lượng`;
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-3">
      {board.length === 0 ? (
        <p className="font-galmuri-9 text-galmuri-body text-[var(--muted-foreground)]">
          Bảng tuyển dụng trống. Thứ 2 hàng tuần sẽ có vị trí mới.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="ft-board">
          {board.map((position) => {
            const fit = fitFor(career, position);
            const chance = passChanceFor(fit, career);
            const missing = missingRequirementLines(career, position);
            const reason = blockReason(position.id, position.company);
            return (
              <li
                key={position.id}
                data-testid={`ft-position-${position.id}`}
                className="flex items-start gap-3 rounded-[var(--radius-tile)] bg-white/70 p-2 shadow-chip"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- pixel badge stays unoptimized */}
                <img
                  src={`/ui/icons/badge_${position.level_tier}.png`}
                  alt={TIER_LABEL[position.level_tier]}
                  width={40}
                  height={40}
                  draggable={false}
                  className="pixelated mt-0.5 block size-auto shrink-0"
                  style={{ width: 40, height: 40 }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
                    {position.title} · {position.company}
                  </p>
                  <p className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
                    {STACK_LABEL[position.stack]} · {TIER_LABEL[position.level_tier]} ·{" "}
                    {formatVnd(baseSalaryOf(position))}/tháng · Cơ hội: {chanceLabel(chance)}
                  </p>
                  <p className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
                    {positionRequirementLines(position).join(" · ")}
                    {position.min_reputation > 0 ? ` · uy tín ${position.min_reputation}` : ""}
                  </p>
                  {missing.length > 0 ? (
                    <ul className="mt-1">
                      {missing.map((line) => (
                        <li
                          key={line}
                          className="font-galmuri-7 text-galmuri-small text-[var(--accent-coral)]"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {reason ? (
                  <BlockedButton
                    label="Nộp đơn"
                    reason={reason}
                    testId={`ft-apply-${position.id}`}
                  />
                ) : (
                  <PixelButton
                    type="button"
                    variant="light"
                    data-testid={`ft-apply-${position.id}`}
                    onClick={() => applyToPosition(position.id)}
                  >
                    Nộp đơn
                  </PixelButton>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <p className="mb-1 font-galmuri-9 text-galmuri-body text-[var(--foreground)]">Đơn đang chờ</p>
        {waiting.length === 0 ? (
          <p className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
            Chưa có đơn nào. Nộp đơn tốn {FULLTIME.apply_energy} năng lượng, kết quả có vào ngày mai.
          </p>
        ) : (
          <ul className="flex flex-col gap-1" data-testid="ft-pending">
            {waiting.map((app) => {
              const position = positionById(app.positionId);
              return (
                <li
                  key={app.id}
                  className="font-galmuri-7 text-galmuri-small text-[var(--foreground)]"
                >
                  {position ? `${position.title} · ${position.company}` : app.positionId} — chờ kết quả
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
