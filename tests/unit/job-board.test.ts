import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SIM_CATALOG } from "@/game/career/content";
import { defaultCareer } from "@/game/career/actions";
import { acceptedJobs, daysUntilDeadline, deadlineIsUrgent } from "@/game/jobs/logic";
import { LIFE } from "@/game/life/content";
import type { PlayerJob } from "@/game/career/types";
import { startTask } from "@/game/task-run/apply";
import { useGameStore } from "@/game/state/store";

function job(status: PlayerJob["status"], id = "job-1"): PlayerJob {
  return {
    id,
    template_id: "landing-html",
    job_type: "freelance",
    status,
    hours_required: 2,
    progress_hours: 0,
    bugs: 0,
    pay: 180_000,
    offered_day: 1,
    accepted_day: status === "active" ? 1 : null,
    deadline_day: 3,
    finished_day: null,
    missed_days: 0,
    task_run: null,
  };
}

describe("job management board", () => {
  it("lists accepted jobs and marks a deadline red at one day", () => {
    expect(LIFE.job_remind_days).toBe(1);
    const rows = acceptedJobs([job("offered", "a"), job("active", "b"), job("completed", "c")]);
    expect(rows.map((row) => row.id)).toEqual(["b"]);
    expect(daysUntilDeadline(3, 2)).toBe(1);
    expect(deadlineIsUrgent(1, LIFE.job_remind_days)).toBe(true);
    expect(deadlineIsUrgent(0, LIFE.job_remind_days)).toBe(true);
    expect(deadlineIsUrgent(2, LIFE.job_remind_days)).toBe(false);
    expect(daysUntilDeadline(null, 2)).toBeNull();
  });

  it("opens the terminal for an accepted job that has not started", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const row = job("active");
    const started = startTask({ ...base, player_jobs: [row] }, row.id, SIM_CATALOG);
    expect(started.error).toBeNull();
    expect(started.state.player_jobs.find((item) => item.id === row.id)).toMatchObject({
      status: "active",
      progress_hours: 0,
      pay: row.pay,
      task_run: { step: "ticket" },
    });
  });

  it("opens from Việc làm as a modal and starts the existing terminal from Làm", () => {
    const board = readFileSync(join(process.cwd(), "src/components/game/career/JobManageBoard.tsx"), "utf8");
    const chrome = readFileSync(join(process.cwd(), "src/components/game/career/CareerChrome.tsx"), "utf8");
    expect(board).toContain('title="Quản lý job"');
    expect(board).toContain(">Job<");
    expect(board).toContain(">Tiền<");
    expect(board).toContain(">Độ khó<");
    expect(board).toContain(">Deadline<");
    expect(board).toContain("text-[var(--accent-coral)]");
    expect(board).toContain("PixelButton");
    expect(board).toContain('variant="light"');
    expect(board).toContain("openTask(job.id)");
    expect(board).toContain("Chưa nhận job nào.");
    expect(chrome).toContain("JobManageBoard");
    expect(chrome).toContain('panel === "jobs"');
    expect(board).toContain("Modal");
    expect(board).toContain('from "@/components/ui/button"');
    expect(chrome).not.toContain("JobBoardPanel");
  });

  it("opens the board from Việc làm and from openJobs", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    useGameStore.setState({ career: base, careerPanel: null, taskJobId: null });
    useGameStore.getState().openCareerPanel("jobs");
    expect(useGameStore.getState().careerPanel).toBe("jobs");

    useGameStore.setState({ careerPanel: null, taskJobId: null });
    useGameStore.getState().runNoticeAction("openJobs");
    expect(useGameStore.getState().careerPanel).toBe("jobs");
    expect(useGameStore.getState().taskJobId).toBeNull();
  });
});
