"use client";

import { SIM_CATALOG } from "@/game/career/content";
import { jobEligibility, jobRequirementsFor, skillNameMap, visibleBoardJobs } from "@/game/jobs/logic";
import { LIFE } from "@/game/life/content";
import { jobEnergyFactor } from "@/game/life/furniture";
import { jobPay, lifeOf } from "@/game/life/logic";
import { scaleTraitPay } from "@/game/life/traits";
import { useGameStore } from "@/game/state/store";
import { snapshot } from "@/game/time";
import { formatVnd } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";
import { PixelIcon } from "../PixelIcon";
import { BlockedButton } from "./BlockedButton";
import { isJobOfferNotice, noticeJobId } from "@/game/jobs/offers";

const names = skillNameMap(SIM_CATALOG.skills);

export function JobBoardPanel({ iconFiles }: { iconFiles: readonly string[] }) {
  const career = useGameStore((s) => s.career);
  const jobs = career.player_jobs;
  const player = useGameStore((s) => s.career.players);
  const life = useGameStore((s) => lifeOf(s.career));
  const skills = useGameStore((s) => s.career.player_skills);
  const energyFactor = useGameStore((s) => jobEnergyFactor(s.career));
  const day = useGameStore((s) => snapshot(s.totalMinutes).day);
  const acceptJob = useGameStore((s) => s.acceptJob);
  const openTask = useGameStore((s) => s.openTask);
  const board = visibleBoardJobs(jobs, day);

  if (board.length === 0) {
    return (
      <p className="font-galmuri-9 text-galmuri-body text-[var(--muted-foreground)]">
        Bảng việc trống. Ngày mới sẽ có việc freelance.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {board.map((job, index) => {
        const template = SIM_CATALOG.jobTemplates.find((row) => row.id === job.template_id);
        if (!template) return null;
        const reqs = jobRequirementsFor(template.id, SIM_CATALOG.jobTemplateRequirements);
        const check = jobEligibility(player, skills, template, reqs, names, {
          workStreak: life.workStreak,
          minEnergy: LIFE.low_energy_job,
          blockFreelance: life.burnoutDay === day,
          energyFactor,
        });
        const pay = scaleTraitPay(jobPay(template.pay, template.tier, player.reputation), career);
        const done = job.status === "completed";
        const active = job.status === "active";
        const xp = SIM_CATALOG.jobTemplateXp
          .filter((row) => row.template_id === template.id)
          .reduce((sum, row) => sum + row.xp, 0);
        return (
          <li
            key={job.id}
            data-testid={`job-card-${job.template_id}`}
            data-state={done ? "done" : active ? "active" : check.ok ? "open" : "locked"}
            className={
              done
                ? "card-done flex items-center gap-3 rounded-[var(--radius-panel)] border border-[var(--panel-border)] bg-white/40 p-2"
                : "card-slide flex items-center gap-3 rounded-[var(--radius-panel)] border border-[var(--panel-border)] bg-white/50 p-2"
            }
            style={done ? undefined : { animationDelay: `${index * 90}ms` }}
          >
            <PixelIcon
              name={done ? "task_done" : active || check.ok ? "job_freelance" : "task_locked"}
              size={44}
              alt=""
              files={iconFiles}
            />
            <div className="min-w-0 flex-1">
              <p className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
                {template.name}
              </p>
              <p className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
                Bậc {template.tier} · {formatVnd(pay)} · {template.energy} năng lượng ·{" "}
                {xp} XP · +{template.reputation_gain} uy tín
              </p>
              {done ? (
                <p className="font-galmuri-7 text-galmuri-small text-[var(--accent-mint)]">Xong</p>
              ) : null}
              {!done && !check.ok ? (
                <ul className="mt-1">
                  {check.missing.map((line) => (
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
            {done ? (
              <PixelIcon name="task_done" size={22} alt="Xong" files={iconFiles} />
            ) : active ? (
              <Button
                type="button"
                size="sm"
                showArrow={false}
                data-testid={`job-accept-${job.template_id}`}
                onClick={() => openTask(job.id)}
              >
                Tiếp tục
              </Button>
            ) : check.ok ? (
              <Button
                type="button"
                size="sm"
                showArrow={false}
                data-testid={`job-accept-${job.template_id}`}
                onClick={() => {
                  // Accept the job (make it active) without starting work
                  const accepted = career.player_jobs.map((j) =>
                    j.id === job.id && j.status === "offered"
                      ? { ...j, status: "active" as const, accepted_day: day }
                      : j
                  );
                  // Remove the matching job offer notice
                  const notices = (career.feed?.notices ?? []).filter(
                    (notice) => noticeJobId(notice) !== job.id
                  );
                  useGameStore.setState({
                    career: {
                      ...career,
                      player_jobs: accepted,
                      feed: career.feed ? { ...career.feed, notices } : career.feed,
                    },
                    careerPanel: "jobs",
                  });
                }}
              >
                Nhận
              </Button>
            ) : (
              <div className="flex flex-col gap-1">
                <BlockedButton
                  label="Nhận"
                  reason={check.missing[0] ?? "Chưa đủ điều kiện"}
                  testId={`job-accept-${job.template_id}`}
                />
                {check.energyShort ? (
                  <Button
                    type="button"
                    size="sm"
                    showArrow={false}
                    variant="outline"
                    data-testid={`job-force-${job.template_id}`}
                    onClick={() => acceptJob(job.id, true)}
                  >
                    Cố làm
                  </Button>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
