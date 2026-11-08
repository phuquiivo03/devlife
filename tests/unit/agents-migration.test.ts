import { describe, expect, it } from "vitest";
import { defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import { PERSIST_VERSION } from "@/game/config";
import { migrateSave } from "@/game/storage/migrate";
import { offerJob } from "@/game/jobs/logic";
import { freshRun } from "@/game/task-run/machine";
import { commitTask, grantTaskSuccess } from "@/game/task-run/apply";

describe("agents migration v27", () => {
  it("does not re-grant payout for already completed task runs on load", () => {
    const career = defaultCareer(5, 480, "student", SIM_CATALOG);
    const jobId = "legacy-done";
    const template = SIM_CATALOG.jobTemplates[0]!;
    const job = {
      ...offerJob(template, 5),
      id: jobId,
      status: "completed" as const,
      finished_day: 5,
      task_run: { ...freshRun(1), step: "result" as const, outcome: "success" as const, start_paid: true },
    };
    const blob = migrateSave(
      {
        stage: "student",
        loadouts: { student: {}, junior: {}, senior: {} },
        showCharacter: true,
        totalMinutes: 5 * 24 * 60,
        openingDone: true,
        openingStep: null,
        career: { ...career, player_jobs: [job], players: { ...career.players, freelance_completed: 4 } },
      },
      26,
    );
    expect(blob.career.agents.owned).toEqual([]);
    const row = blob.career.player_jobs.find((j) => j.id === jobId);
    expect(row?.status).toBe("completed");
    const before = blob.career.players.money;
    const dup = grantTaskSuccess(blob.career, jobId, SIM_CATALOG);
    expect(dup.error).not.toBeNull();
    expect(dup.state.players.money).toBe(before);
  });

  it("ready commit is revision-guarded", () => {
    const { state, job } = openReady();
    const run = state.player_jobs.find((row) => row.id === job.id)!.task_run!;
    const bad = commitTask(state, job.id, SIM_CATALOG, run.revision + 99);
    expect(bad.error).toMatch(/sẵn sàng/);
  });
});

function openReady() {
  const career = defaultCareer(2, 480, "student", SIM_CATALOG);
  const template = SIM_CATALOG.jobTemplates[0]!;
  const job = {
    ...career.player_jobs[0]!,
    id: "ready-job",
    status: "active" as const,
    template_id: template.id,
    task_run: {
      ...freshRun(3),
      step: "ready" as const,
      start_paid: true,
      revision: 2,
    },
  };
  return { state: { ...career, player_jobs: [job] }, job };
}
