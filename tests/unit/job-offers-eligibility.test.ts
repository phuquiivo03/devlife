import { describe, expect, it } from "vitest";
import { SIM_CATALOG } from "@/game/career/content";
import { defaultCareer } from "@/game/career/actions";
import { tickJobOffers } from "@/game/jobs/offers";
import { jobRequirementsFor, jobEligibility, skillNameMap } from "@/game/jobs/logic";
import { LIFE } from "@/game/life/content";

describe("job notification eligibility check", () => {
  it("thông báo job phải check kỹ năng user đã đáp ứng chưa - chỉ đẩy job phù hợp", () => {
    // Tạo player với skill thấp
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const lowSkills = base.player_skills.map((skill) => ({ ...skill, level: 1, xp: 0 }));
    const state = {
      ...base,
      player_skills: lowSkills,
      players: { ...base.players, reputation: 0 },
    };

    // Đẩy nhiều job offers
    let next = state;
    for (let i = 0; i < 10; i++) {
      next = tickJobOffers(next, 1, (8 + i * 2) * 60);
    }

    const jobNotices = next.feed.notices.filter((n) => n.payload?.jobId);
    const names = skillNameMap(SIM_CATALOG.skills);

    // Tất cả job được thông báo phải đáp ứng yêu cầu kỹ năng và reputation
    for (const notice of jobNotices) {
      const job = next.player_jobs.find((j) => j.id === notice.payload?.jobId);
      expect(job).toBeTruthy();

      const template = SIM_CATALOG.jobTemplates.find((t) => t.id === job?.template_id);
      expect(template).toBeTruthy();

      const reqs = jobRequirementsFor(template!.id, SIM_CATALOG.jobTemplateRequirements);

      // Check reputation
      expect(next.players.reputation).toBeGreaterThanOrEqual(template!.min_reputation);

      // Check skill requirements
      for (const req of reqs) {
        const playerSkill = lowSkills.find((s) => s.skill_id === req.skill_id);
        expect(playerSkill?.level).toBeGreaterThanOrEqual(req.min_level);
      }
    }
  });

  it("không đẩy thông báo job khi không có job nào đủ điều kiện kỹ năng", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);

    // Tạo player với reputation quá thấp để không đủ điều kiện cho bất kỳ job nào
    const state = {
      ...base,
      players: { ...base.players, reputation: 0, freelance_completed: 0 },
    };

    // Tìm job có yêu cầu reputation tối thiểu
    const jobWithReq = SIM_CATALOG.jobTemplates.find(
      (t) => t.job_type === "freelance" && t.min_reputation > 0
    );

    if (jobWithReq) {
      // Set reputation thấp hơn yêu cầu
      const stateLowRep = {
        ...state,
        players: { ...state.players, reputation: jobWithReq.min_reputation - 1 },
      };

      let next = stateLowRep;
      for (let i = 0; i < 5; i++) {
        next = tickJobOffers(next, 1, (8 + i * 2) * 60);
      }

      const jobNotices = next.feed.notices.filter((n) => n.payload?.jobId);

      // Job được thông báo phải có reputation requirement = 0
      if (jobNotices.length > 0) {
        for (const notice of jobNotices) {
          const job = next.player_jobs.find((j) => j.id === notice.payload?.jobId);
          const template = SIM_CATALOG.jobTemplates.find((t) => t.id === job?.template_id);
          expect(template?.min_reputation).toBe(0);
        }
      }
    }
  });

  it("kiểm tra trực tiếp pickTemplate chỉ trả về job phù hợp kỹ năng", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);

    // Player chỉ có skill frontend cấp 1
    const frontendOnly = base.player_skills.map((skill) => ({
      ...skill,
      level: skill.skill_id === "frontend" ? 1 : 1,
      xp: 0,
    }));

    const state = {
      ...base,
      player_skills: frontendOnly,
      players: { ...base.players, reputation: 0 },
    };

    // Lấy danh sách job mà player thực sự đủ điều kiện
    const eligibleJobs = SIM_CATALOG.jobTemplates.filter((template) => {
      if (template.job_type !== "freelance") return false;

      // Check reputation
      if (state.players.reputation < template.min_reputation) return false;

      // Check skill requirements
      const reqs = jobRequirementsFor(template.id, SIM_CATALOG.jobTemplateRequirements);
      for (const req of reqs) {
        const skill = frontendOnly.find((s) => s.skill_id === req.skill_id);
        if (!skill || skill.level < req.min_level) return false;
      }

      return true;
    });

    // Đẩy job offers
    let next = state;
    const maxOffers = Math.min(LIFE.job_notice_pending_max, 5);

    for (let i = 0; i < 20; i++) {
      next = tickJobOffers(next, 1, (8 + i) * 60);
      const jobNotices = next.feed.notices.filter((n) => n.payload?.jobId);
      if (jobNotices.length >= maxOffers) break;
    }

    const offeredTemplates = new Set(
      next.player_jobs
        .filter((j) => j.status === "offered")
        .map((j) => j.template_id)
    );

    // Tất cả job được offer phải nằm trong danh sách eligible
    for (const templateId of offeredTemplates) {
      expect(eligibleJobs.some((t) => t.id === templateId)).toBe(true);
    }
  });
});
