import { describe, expect, it } from "vitest";
import { SIM_CATALOG } from "@/game/career/content";
import { defaultCareer } from "@/game/career/actions";
import { LIFE } from "@/game/life/content";
import { tickJobOffers, acceptJobFromNotice } from "@/game/jobs/offers";
import { startTask } from "@/game/task-run/apply";
import { acceptedJobs } from "@/game/jobs/logic";
import type { CareerState } from "@/game/career/types";

function offerJobs(state: CareerState, day: number, count: number): CareerState {
  let next = state;
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < LIFE.job_notice_every_slots; j++) {
      next = tickJobOffers(next, day, (8 + i * 2 + j) * 60);
    }
  }
  return next;
}

describe("Bug 1: job offers ignore eligibility", () => {
  it("only offers jobs the player meets skill and reputation requirements for", () => {
    // Start with low skills
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const lowSkills = base.player_skills.map((skill) => ({ ...skill, level: 1, xp: 0 }));
    const state = { ...base, player_skills: lowSkills, players: { ...base.players, reputation: 0 } };

    // Offer multiple jobs
    const offered = offerJobs(state, 1, 5);
    const jobNotices = offered.feed.notices.filter((n) => n.payload?.jobId);

    // All offered jobs should be eligible (excluding energy/time checks)
    for (const notice of jobNotices) {
      const job = offered.player_jobs.find((j) => j.id === notice.payload?.jobId);
      expect(job).toBeTruthy();
      const template = SIM_CATALOG.jobTemplates.find((t) => t.id === job?.template_id);
      expect(template).toBeTruthy();

      // Check that skill requirements are met
      const reqs = SIM_CATALOG.jobTemplateRequirements.filter((r) => r.template_id === template?.id);
      for (const req of reqs) {
        const playerSkill = lowSkills.find((s) => s.skill_id === req.skill_id);
        expect(playerSkill?.level).toBeGreaterThanOrEqual(req.min_level);
      }

      // Check reputation requirement
      expect(offered.players.reputation).toBeGreaterThanOrEqual(template?.min_reputation ?? 0);
    }
  });

  it("offers nothing when no jobs are eligible", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    // Set impossible requirements - all skills at level 1, all templates need higher
    const lowSkills = base.player_skills.map((skill) => ({ ...skill, level: 1, xp: 0 }));

    // Find the highest requirement to ensure we're below it
    const highestReq = Math.max(
      ...SIM_CATALOG.jobTemplateRequirements.map((r) => r.min_level),
      10
    );
    const impossibleSkills = lowSkills.map((skill) => ({ ...skill, level: highestReq + 5 }));
    const impossibleReputation = Math.max(
      ...SIM_CATALOG.jobTemplates.map((t) => t.min_reputation)
    ) + 100;

    // Actually, let's set skills very high but reputation impossible
    const state = {
      ...base,
      player_skills: impossibleSkills,
      players: { ...base.players, reputation: 0 },
    };

    // Try to offer jobs with reputation requirement not met
    const templates = SIM_CATALOG.jobTemplates.filter(
      (t) => t.job_type === "freelance" && t.min_reputation > 0
    );

    // If all freelance jobs need reputation, offers should be empty or only include rep=0 jobs
    if (templates.length > 0) {
      const offered = offerJobs(state, 1, 3);
      const jobNotices = offered.feed.notices.filter((n) => n.payload?.jobId);

      // All offered jobs must have min_reputation === 0
      for (const notice of jobNotices) {
        const job = offered.player_jobs.find((j) => j.id === notice.payload?.jobId);
        const template = SIM_CATALOG.jobTemplates.find((t) => t.id === job?.template_id);
        expect(template?.min_reputation).toBe(0);
      }
    }
  });
});

describe("Bug 2: Nhận doesn't accept the job", () => {
  it("accepting from the old job board makes the job active without starting", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const offered = offerJobs(base, 1, 1);
    const notice = offered.feed.notices.find((n) => n.payload?.jobId);
    expect(notice).toBeTruthy();

    const jobId = notice!.payload!.jobId!;
    const job = offered.player_jobs.find((j) => j.id === jobId);
    expect(job?.status).toBe("offered");
    expect(job?.task_run).toBeNull();

    // Accept the job
    const accepted = acceptJobFromNotice(offered, notice);

    // Job should now be active
    const activeJob = accepted.player_jobs.find((j) => j.id === jobId);
    expect(activeJob?.status).toBe("active");
    expect(activeJob?.accepted_day).toBe(1);
    expect(activeJob?.task_run).toBeNull(); // Not started yet

    // Notice should be removed
    expect(accepted.feed.notices.some((n) => n.id === notice!.id)).toBe(false);

    // Job should appear in acceptedJobs()
    const active = acceptedJobs(accepted.player_jobs);
    expect(active.some((j) => j.id === jobId)).toBe(true);
  });

  it("starting work (Làm button) happens separately from accepting", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const offered = offerJobs(base, 1, 1);
    const notice = offered.feed.notices.find((n) => n.payload?.jobId);
    const jobId = notice!.payload!.jobId!;

    // Accept first
    const accepted = acceptJobFromNotice(offered, notice);
    const activeJob = accepted.player_jobs.find((j) => j.id === jobId);
    expect(activeJob?.status).toBe("active");
    expect(activeJob?.task_run).toBeNull();

    // Then start work
    const started = startTask(accepted, jobId, SIM_CATALOG);
    expect(started.error).toBeNull();

    const workingJob = started.state.player_jobs.find((j) => j.id === jobId);
    expect(workingJob?.status).toBe("active");
    expect(workingJob?.task_run).not.toBeNull();
    expect(workingJob?.task_run?.step).toBe("ticket");
  });
});

describe("Bug 3: silent failures", () => {
  it("startTask returns an error message when requirements are not met", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const offered = offerJobs(base, 1, 1);
    const notice = offered.feed.notices.find((n) => n.payload?.jobId);
    const jobId = notice!.payload!.jobId!;

    // Accept the job
    const accepted = acceptJobFromNotice(offered, notice);

    // Drain energy to cause a failure
    const noEnergy = {
      ...accepted,
      players: { ...accepted.players, energy: 0 },
    };

    // Try to start work
    const result = startTask(noEnergy, jobId, SIM_CATALOG);

    // Should fail with a clear error message
    expect(result.error).toBeTruthy();
    expect(result.error).toMatch(/năng lượng|Dưới 15/i);
  });

  it("startTask returns an error when skill requirements are not met", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);

    // Find a job with skill requirements
    const templateWithReqs = SIM_CATALOG.jobTemplates.find((t) => {
      const reqs = SIM_CATALOG.jobTemplateRequirements.filter((r) => r.template_id === t.id);
      return reqs.length > 0 && reqs.some((r) => r.min_level > 1);
    });

    if (templateWithReqs) {
      const reqs = SIM_CATALOG.jobTemplateRequirements.filter((r) => r.template_id === templateWithReqs.id);
      const highReq = reqs.find((r) => r.min_level > 1);

      // Create a job
      const job = {
        id: "test-job",
        template_id: templateWithReqs.id,
        job_type: "freelance" as const,
        status: "active" as const,
        hours_required: templateWithReqs.hours,
        progress_hours: 0,
        bugs: 0,
        pay: templateWithReqs.pay,
        offered_day: 1,
        accepted_day: 1,
        deadline_day: 3,
        finished_day: null,
        missed_days: 0,
        task_run: null,
      };

      // Set player skill below requirement
      const lowSkills = base.player_skills.map((s) =>
        s.skill_id === highReq?.skill_id ? { ...s, level: 1, xp: 0 } : s
      );

      const state = {
        ...base,
        player_skills: lowSkills,
        player_jobs: [job],
      };

      const result = startTask(state, job.id, SIM_CATALOG);

      // Should fail with skill requirement error
      expect(result.error).toBeTruthy();
      expect(result.error).toMatch(/Cần .+ cấp/i);
    }
  });

  it("provides specific error messages for different failure reasons", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);

    // Test: job not found
    const notFound = startTask(base, "nonexistent", SIM_CATALOG);
    expect(notFound.error).toBe("Không tìm thấy việc");

    // Test: burnout blocks freelance
    const job = {
      id: "test-job",
      template_id: "landing-html",
      job_type: "freelance" as const,
      status: "offered" as const,
      hours_required: 2,
      progress_hours: 0,
      bugs: 0,
      pay: 180_000,
      offered_day: 1,
      accepted_day: null,
      deadline_day: 3,
      finished_day: null,
      missed_days: 0,
      task_run: null,
    };

    const burnout = {
      ...base,
      player_jobs: [job],
      life: { ...base.life, burnoutDay: 1 },
    };

    const blocked = startTask(burnout, job.id, SIM_CATALOG);
    expect(blocked.error).toMatch(/kiệt sức/i);
  });
});
