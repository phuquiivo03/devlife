import { describe, expect, it } from "vitest";
import { SIM_CATALOG } from "@/game/career/content";
import type { PlayerJob } from "@/game/career/types";
import { PERSIST_VERSION } from "@/game/config";
import { LIFE } from "@/game/life/content";
import { migrateSave } from "@/game/storage/migrate";
import { snapshot } from "@/game/time";

function job(partial: Partial<PlayerJob> & Pick<PlayerJob, "id" | "status" | "template_id">): PlayerJob {
  return {
    job_type: "freelance",
    hours_required: 4,
    progress_hours: 0,
    bugs: 0,
    pay: 180_000,
    offered_day: 1,
    accepted_day: null,
    deadline_day: 2,
    finished_day: null,
    missed_days: 0,
    task_run: null,
    ...partial,
  };
}

describe("version 18 job migration", () => {
  it("bumps the persist version and reads deadlines from config", () => {
    expect(PERSIST_VERSION).toBe(18);
    expect(LIFE.job_deadline_easy).toBe(2);
    expect(LIFE.job_deadline_mid).toBe(3);
    expect(LIFE.job_deadline_hard).toBe(4);
  });

  it("turns offered and in-progress jobs into accepted jobs from today", () => {
    const totalMinutes = 2 * 24 * 60 + 8 * 60;
    const today = snapshot(totalMinutes).day;
    const easy = SIM_CATALOG.jobTemplates.find((row) => row.tier <= 1)!;
    const mid = SIM_CATALOG.jobTemplates.find((row) => row.tier === 2)!;
    const saved = migrateSave(
      {
        stage: "student",
        totalMinutes,
        career: {
          players: { money: 42 },
          player_skills: [{ skill_id: "frontend", level: 4, xp: 9 }],
          player_jobs: [
            job({
              id: "open",
              status: "offered",
              template_id: easy.id,
              pay: 150_000,
              progress_hours: 0,
            }),
            job({
              id: "doing",
              status: "active",
              template_id: mid.id,
              pay: 500_000,
              progress_hours: 2,
              accepted_day: 1,
              task_run: {
                step: "build",
                seed: 7,
                ticket: null,
                build: "careful",
                event_id: null,
                bugs_total: 2,
                bugs_caught: 1,
                retries: 1,
                outcome: null,
                time_bonus_sec: 0,
              },
            }),
            job({
              id: "done",
              status: "completed",
              template_id: easy.id,
              progress_hours: 4,
              finished_day: 2,
            }),
            job({ id: "old", status: "expired", template_id: easy.id }),
          ],
        },
      },
      17,
    );
    expect(saved.career.players.money).toBe(42);
    expect(saved.career.player_skills.find((skill) => skill.skill_id === "frontend")).toMatchObject({
      level: 4,
      xp: 9,
    });
    expect(saved.career.player_jobs.find((row) => row.id === "open")).toMatchObject({
      status: "active",
      accepted_day: today,
      deadline_day: today + LIFE.job_deadline_easy,
      pay: 150_000,
      progress_hours: 0,
    });
    expect(saved.career.player_jobs.find((row) => row.id === "doing")).toMatchObject({
      status: "active",
      accepted_day: 1,
      deadline_day: today + LIFE.job_deadline_mid,
      pay: 500_000,
      progress_hours: 2,
      task_run: { step: "build", seed: 7, bugs_total: 2, bugs_caught: 1 },
    });
    expect(saved.career.player_jobs.find((row) => row.id === "done")).toMatchObject({
      status: "completed",
      progress_hours: 4,
      finished_day: 2,
    });
    expect(saved.career.player_jobs.find((row) => row.id === "old")?.status).toBe("expired");

    const already = migrateSave(
      {
        stage: "student",
        totalMinutes,
        career: {
          players: { money: 42 },
          player_jobs: [
            job({
              id: "kept",
              status: "offered",
              template_id: easy.id,
              deadline_day: 9,
            }),
          ],
        },
      },
      18,
    );
    expect(already.career.player_jobs.find((row) => row.id === "kept")).toMatchObject({
      status: "offered",
      deadline_day: 9,
    });
  });
});
