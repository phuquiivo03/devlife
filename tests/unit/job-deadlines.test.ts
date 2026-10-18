import { describe, expect, it, vi } from "vitest";
import { SIM_CATALOG } from "@/game/career/content";
import { defaultCareer } from "@/game/career/actions";
import type { PlayerJob } from "@/game/career/types";
import { applyJobDeadlines } from "@/game/jobs/deadlines";
import { deadlineDaysForTier, offerJob } from "@/game/jobs/logic";
import { LIFE } from "@/game/life/content";
import { syncLifeSurface } from "@/game/life/events";
import { migrateSave } from "@/game/storage/migrate";
import { useGameStore } from "@/game/state/store";

function active(day: number, deadline: number, id = "job-1"): PlayerJob {
  const template = SIM_CATALOG.jobTemplates[0]!;
  return {
    ...offerJob(template, day),
    id,
    status: "active",
    accepted_day: day,
    deadline_day: deadline,
    progress_hours: 1,
  };
}

describe("job deadlines", () => {
  it("reads the deadline, late, and reminder numbers from config", () => {
    expect(LIFE.job_deadline_easy).toBe(2);
    expect(LIFE.job_deadline_mid).toBe(3);
    expect(LIFE.job_deadline_hard).toBe(4);
    expect(LIFE.job_late_reputation).toBe(-5);
    expect(LIFE.job_late_mood).toBe(-3);
    expect(LIFE.job_remind_days).toBe(1);
    expect(deadlineDaysForTier(1)).toBe(2);
    expect(deadlineDaysForTier(2)).toBe(3);
    expect(deadlineDaysForTier(3)).toBe(4);
  });

  it("cancels a late job and reminds one day out", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const late = active(1, 2, "late-job");
    const soon = active(1, 4, "soon-job");
    const state = {
      ...base,
      players: { ...base.players, reputation: 20, mood: 40, money: 42 },
      player_jobs: [late, soon],
    };
    const settled = applyJobDeadlines(state, 3, 8 * 60);
    expect(settled.player_jobs.find((job) => job.id === "late-job")).toMatchObject({
      status: "failed",
      progress_hours: 1,
    });
    expect(settled.player_jobs.find((job) => job.id === "soon-job")?.status).toBe("active");
    expect(settled.players.reputation).toBe(20 + LIFE.job_late_reputation);
    expect(settled.players.mood).toBe(40 + LIFE.job_late_mood);
    expect(settled.players.money).toBe(42);
    expect(settled.feed.notices.find((notice) => notice.id === "late-late-job")?.text).toBe(
      `Trễ deadline: ${SIM_CATALOG.jobTemplates[0]?.name}`,
    );

    const reminded = applyJobDeadlines(state, 3, 8 * 60);
    const again = applyJobDeadlines(
      { ...state, player_jobs: [soon] },
      soon.deadline_day! - LIFE.job_remind_days,
      9 * 60,
    );
    const notice = again.feed.notices.find((row) => row.payload?.jobId === "soon-job");
    expect(notice?.actions).toEqual([
      { id: "openJobs", label: "Làm", variant: "primary" },
    ]);
    expect(notice?.action).toBe("openJobs");
    expect(notice).not.toHaveProperty("jobId");
    expect(notice?.text).toContain(SIM_CATALOG.jobTemplates[0]?.name ?? "");
    expect(reminded.player_jobs.find((job) => job.id === "late-job")?.status).toBe("failed");

    const surface = syncLifeSurface(again, soon.deadline_day! - LIFE.job_remind_days, 9 * 60, false);
    expect(surface.state.feed.notices.filter((row) => row.id === notice?.id)).toHaveLength(1);
    expect(surface.state.feed.notices.some((row) => row.text === "Deadline còn 1 ngày.")).toBe(false);
  });

  it("keeps openJobs through a load and opens the terminal for that job", () => {
    const saved = migrateSave(
      {
        stage: "student",
        totalMinutes: 480,
        career: {
          players: { money: 42 },
          player_skills: [{ skill_id: "frontend", level: 4, xp: 9 }],
          feed: {
            notices: [{ id: "soon", text: "Còn 1 ngày: API", action: "openJobs", actions: ["openJobs"], jobId: "job-1" }],
          },
        },
      },
      16,
    );
    expect(saved.career.players.money).toBe(42);
    expect(saved.career.player_skills.find((skill) => skill.skill_id === "frontend")).toMatchObject({
      level: 4,
      xp: 9,
    });
    expect(saved.career.feed.notices[0]).toMatchObject({
      action: "openJobs",
      actions: [{ id: "openJobs", label: "Làm" }],
      payload: { jobId: "job-1" },
    });
    expect(saved.career.feed.notices[0]).not.toHaveProperty("jobId");

    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const job = active(1, 3, "job-1");
    useGameStore.setState({
      career: {
        ...base,
        player_jobs: [job],
        feed: {
          ...base.feed,
          notices: [
            {
              id: "deadline-job-1",
              day: 1,
              minute: 0,
              severity: "warn",
              icon: "icon_notif_deadline.png",
              text: "Còn 1 ngày: API",
              action: "openJobs",
              actions: [{ id: "openJobs", label: "Làm", variant: "primary" }],
              payload: { jobId: "job-1" },
              read: false,
            },
          ],
        },
      },
      careerPanel: null,
      taskJobId: null,
    });
    const reminder = useGameStore.getState().career.feed?.notices.find((row) => row.id === "deadline-job-1");
    useGameStore.getState().runNoticeAction("openJobs", reminder);
    expect(useGameStore.getState().taskJobId).toBe("job-1");
    expect(useGameStore.getState().career.player_jobs.find((row) => row.id === "job-1")?.task_run?.step).toBe(
      "ticket",
    );
    expect(useGameStore.getState().careerPanel).toBeNull();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useGameStore.getState().runNoticeAction("nope" as "openJobs");
    expect(warn).toHaveBeenCalledWith('Unknown notice action "nope"');
    expect(useGameStore.getState().taskJobId).toBe("job-1");
    warn.mockRestore();
  });
});
