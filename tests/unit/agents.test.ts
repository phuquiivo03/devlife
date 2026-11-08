import { describe, expect, it } from "vitest";
import { defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import { agentBuyBlock, buyAgent, filterBugsForAgent, agentSnapshot, retryEnergyCost } from "@/game/agents/logic";
import { TASK_RUN } from "@/game/task-run/content";
import { ensureTodayBoard } from "@/game/career/actions";
import { jobEligibility, skillNameMap } from "@/game/jobs/logic";
import { beginTaskRun, openTaskRun } from "@/game/task-run/apply";
import { applyRetry } from "@/game/task-run/machine";

describe("agents shop", () => {
  it("blocks purchase before gate and duplicate buy", () => {
    let state = defaultCareer(1, 480, "student", SIM_CATALOG);
    const id = "copilot_inspired" as const;
    expect(agentBuyBlock(state, id)).toMatch(/freelance/);
    state = { ...state, players: { ...state.players, freelance_completed: 1, money: 1_000_000 } };
    expect(agentBuyBlock(state, id)).toBeNull();
    const first = buyAgent(state, id);
    expect(first.error).toBeNull();
    const second = buyAgent(first.state, id);
    expect(second.error).toMatch(/Đã có/);
  });
});

describe("agent task path", () => {
  it("keeps bug ids on retry after agent code", () => {
    const base = defaultCareer(3, 480, "student", SIM_CATALOG);
    const withMoney = {
      ...base,
      players: { ...base.players, freelance_completed: 2, money: 5_000_000, energy: 80 },
      agents: { owned: ["copilot_inspired" as const] },
    };
    const board = ensureTodayBoard(withMoney, 3, SIM_CATALOG);
    const names = skillNameMap(SIM_CATALOG.skills);
    const boardJob = board.state.player_jobs.find((row) => {
      const template = SIM_CATALOG.jobTemplates.find((item) => item.id === row.template_id);
      if (!template || row.status !== "offered") return false;
      return jobEligibility(
        board.state.players,
        board.state.player_skills,
        template,
        SIM_CATALOG.jobTemplateRequirements.filter((req) => req.template_id === template.id),
        names,
      ).ok;
    });
    if (!boardJob) throw new Error("no job");
    const opened = openTaskRun(board.state, boardJob.id, SIM_CATALOG);
    const began = beginTaskRun(opened.state, boardJob.id, { mode: "agent", coderId: "copilot_inspired" }, SIM_CATALOG);
    expect(began.error).toBeNull();
    const run = began.state.player_jobs.find((j) => j.id === boardJob.id)?.task_run;
    if (!run) throw new Error("missing task_run");
    const ids = [...run.bug_ids];
    const retried = applyRetry({ ...run, step: "result", outcome: "fail", retries: 0 }, true);
    expect(retried.bug_ids).toEqual(ids);
    expect(retried.fixed_bug_ids).toEqual(run.fixed_bug_ids);
  });

  it("filters bugs deterministically", () => {
    const snap = agentSnapshot("claude_inspired");
    const a = filterBugsForAgent(99, snap, 5);
    const b = filterBugsForAgent(99, snap, 5);
    expect(a).toEqual(b);
    expect(a.length).toBeLessThanOrEqual(5);
  });
});

describe("retry energy", () => {
  it("uses scaled retry cost helper", () => {
    const state = defaultCareer(1, 480, "student", SIM_CATALOG);
    expect(retryEnergyCost(state)).toBeGreaterThan(0);
    expect(retryEnergyCost(state)).toBeGreaterThanOrEqual(TASK_RUN.retry_energy);
  });
});
