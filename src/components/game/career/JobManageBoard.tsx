"use client";

import { SIM_CATALOG } from "@/game/career/content";
import { acceptedJobs, daysUntilDeadline, deadlineIsUrgent } from "@/game/jobs/logic";
import { LIFE } from "@/game/life/content";
import { useGameStore } from "@/game/state/store";
import { snapshot } from "@/game/time";
import { formatVnd } from "@/lib/format-currency";
import { Modal } from "@/components/ui/modal";
import { PixelButton } from "@/components/ui/button";

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

export function JobManageBoard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
              return (
                <tr
                  key={job.id}
                  data-testid={`job-row-${job.id}`}
                  className="border-t border-[var(--panel-border)]"
                >
                  <td className="py-2 pr-3 font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
                    {template?.name ?? job.template_id}
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
    </Modal>
  );
}
