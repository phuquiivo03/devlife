"use client";

import { useState } from "react";
import { SIM_CATALOG } from "@/game/career/content";
import { acceptedJobs, daysUntilDeadline, deadlineIsUrgent } from "@/game/jobs/logic";
import { LIFE } from "@/game/life/content";
import { FULLTIME, daysUntilPayday, employmentOf } from "@/game/jobs/fulltime";
import { useGameStore } from "@/game/state/store";
import { snapshot } from "@/game/time";
import { formatVnd } from "@/lib/format-currency";
import { Modal } from "@/components/ui/modal";
import { PixelButton } from "@/components/ui/button";
import { RecruitPanel } from "./RecruitPanel";
import { JobBoardPanel } from "./JobBoardPanel";

function difficultyLabel(tier: number): string {
  if (tier <= 1) return "Dễ";
  if (tier === 2) return "Vừa";
  return "Khó";
}

function deadlineLabel(daysLeft: number | null): string {
  if (daysLeft == null) return "—";
  if (daysLeft === 1) return "còn 1 ngày";
  return `còn ${daysLeft} ngày`;
}

type JobsTab = "main" | "recruit" | "freelance";

const TABS: { id: JobsTab; label: string; testId: string }[] = [
  { id: "main", label: "Công việc chính", testId: "jobs-tab-main" },
  { id: "recruit", label: "Tuyển dụng", testId: "jobs-tab-recruit" },
  { id: "freelance", label: "Freelance", testId: "jobs-tab-freelance" },
];

/** The current full-time job card: company, salary, strikes, payday, penalty. */
function EmploymentCard({ onBrowse }: { onBrowse: () => void }) {
  const career = useGameStore((s) => s.career);
  const day = useGameStore((s) => snapshot(s.totalMinutes).day);
  const current = employmentOf(career).current;

  if (!current) {
    return (
      <div className="mb-3 flex flex-col gap-2 rounded-[var(--radius-tile)] bg-white/70 p-3 shadow-chip">
        <p className="font-galmuri-9 text-galmuri-body text-[var(--muted-foreground)]">
          Chưa có việc chính. Vị trí tuyển dụng làm mới mỗi thứ 2.
        </p>
        <div>
          <PixelButton type="button" variant="light" onClick={onBrowse} data-testid="ft-browse">
            Xem tuyển dụng
          </PixelButton>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-3 flex flex-col gap-1 rounded-[var(--radius-tile)] bg-white/70 p-3 shadow-chip"
      data-testid="ft-current"
    >
      <p className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
        {current.title} · {current.company}
      </p>
      <p className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
        {formatVnd(current.salary)}/tháng · đã làm {current.totalDays} ngày
      </p>
      <p className="font-galmuri-7 text-galmuri-small text-[var(--foreground)]">
        Strike:{" "}
        <span
          data-testid="ft-strikes"
          className={
            current.strikes >= FULLTIME.strike_warn
              ? "text-[var(--accent-coral)]"
              : undefined
          }
        >
          {current.strikes}/{FULLTIME.strike_fire}
        </span>{" "}
        · Trả lương sau {daysUntilPayday(day)} ngày
      </p>
      {current.monthPenalty > 0 ? (
        <p className="font-galmuri-7 text-galmuri-small text-[var(--accent-coral)]">
          Phạt trễ tháng này: −{formatVnd(current.monthPenalty)}
        </p>
      ) : null}
    </div>
  );
}

export function JobManageBoard({
  open,
  onOpenChange,
  iconFiles = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  iconFiles?: readonly string[];
}) {
  const [tab, setTab] = useState<JobsTab>("main");
  const jobs = useGameStore((s) => s.career.player_jobs);
  const day = useGameStore((s) => snapshot(s.totalMinutes).day);
  const openTask = useGameStore((s) => s.openTask);
  const acceptJob = useGameStore((s) => s.acceptJob);
  const accepted = acceptedJobs(jobs);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Quản lý job"
      testId="job-manage"
      closeLabel="Đóng"
      maxWidthPx={640}
    >
      <div className="mb-3 flex flex-wrap gap-2" data-testid="jobs-tabs">
        {TABS.map((row) => (
          <PixelButton
            key={row.id}
            type="button"
            variant={tab === row.id ? "primary" : "light"}
            data-testid={row.testId}
            onClick={() => setTab(row.id)}
          >
            {row.label}
          </PixelButton>
        ))}
      </div>

      {tab === "main" ? (
        <>
          <EmploymentCard onBrowse={() => setTab("recruit")} />
          {accepted.length === 0 ? (
            <p className="font-galmuri-9 text-galmuri-body text-[var(--muted-foreground)]">Chưa nhận job nào.</p>
          ) : (
            <table className="w-full border-collapse text-left" data-testid="job-table">
              <thead>
                <tr className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
                  <th className="pb-2 pr-3 font-normal">Job</th>
                  <th className="pb-2 pr-3 font-normal">Tiền</th>
                  <th className="pb-2 pr-3 font-normal">Độ khó</th>
                  <th className="pb-2 pr-3 font-normal">Deadline</th>
                  <th className="pb-2 font-normal" aria-label="Làm" />
                </tr>
              </thead>
              <tbody>
                {accepted.map((job) => {
                  const template = SIM_CATALOG.jobTemplates.find((row) => row.id === job.template_id);
                  const daysLeft = daysUntilDeadline(job.deadline_day, day);
                  const urgent = deadlineIsUrgent(daysLeft, LIFE.job_remind_days);
                  const company = job.source === "company";
                  return (
                    <tr
                      key={job.id}
                      data-testid={`job-row-${job.id}`}
                      className="border-t border-[var(--panel-border)]"
                    >
                      <td className="py-2 pr-3 font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
                        {template?.name ?? job.template_id}{" "}
                        <span
                          data-testid={`job-source-${job.id}`}
                          data-source={company ? "company" : "freelance"}
                          className="ml-1 rounded-[var(--radius-chip)] px-1.5 py-0.5 font-galmuri-7 text-galmuri-small"
                          style={
                            company
                              ? { background: "var(--pill-violet, #e7ddff)", color: "#6b4bd6" }
                              : { background: "var(--pill-mint)", color: "#2f8f68" }
                          }
                        >
                          {company ? "Công ty" : "Freelance"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 font-galmuri-7 text-galmuri-small text-[var(--foreground)]">
                        {formatVnd(job.pay)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 font-galmuri-7 text-galmuri-small text-[var(--foreground)]">
                        {difficultyLabel(template?.tier ?? 1)}
                      </td>
                      <td
                        data-testid={`job-deadline-${job.id}`}
                        data-urgent={urgent ? "1" : "0"}
                        className={
                          urgent
                            ? "whitespace-nowrap py-2 pr-3 font-galmuri-7 text-galmuri-small text-[var(--accent-coral)]"
                            : "whitespace-nowrap py-2 pr-3 font-galmuri-7 text-galmuri-small text-[var(--foreground)]"
                        }
                      >
                        {deadlineLabel(daysLeft)}
                      </td>
                      <td className="py-2 text-right">
                        <PixelButton
                          type="button"
                          variant="light"
                          data-testid={`job-do-${job.id}`}
                          onClick={() => (job.task_run ? openTask(job.id) : acceptJob(job.id))}
                        >
                          Làm
                        </PixelButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      ) : null}

      {tab === "recruit" ? <RecruitPanel /> : null}
      {tab === "freelance" ? <JobBoardPanel iconFiles={iconFiles} /> : null}
    </Modal>
  );
}
