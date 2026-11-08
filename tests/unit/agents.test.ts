import { describe, expect, it } from "vitest";
import { defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import {
  agentBuyBlock,
  buyAgent,
  filterBugsForAgent,
  agentSnapshot,
  retryEnergyCost,
  licenseDays,
} from "@/game/agents/logic";
import type { AgentId } from "@/game/agents/types";
import { TASK_RUN } from "@/game/task-run/content";
import { agentFixTotalSec, buildRemainingSec } from "@/game/task-run/timing";
import { freshRun } from "@/game/task-run/machine";
import { ensureTodayBoard } from "@/game/career/actions";
import { jobEligibility, skillNameMap } from "@/game/jobs/logic";
import {
  beginTaskRun,
  chooseTaskFixer,
  commitTask,
  completeAgentBuild,
  openTaskRun,
} from "@/game/task-run/apply";
import { applyRetry } from "@/game/task-run/machine";

function activeAgents(state: ReturnType<typeof defaultCareer>, ids: AgentId[]) {
  const day = state.players.game_day;
  const licenses = Object.fromEntries(
    ids.map((id) => [id, { bought_day: day, expires_day: day + licenseDays() }]),
  );
  return { ...state, agents: { owned: ids, licenses } };
}

describe("agents shop", () => {
  it("blocks purchase before gate and duplicate buy while active", () => {
    let state = defaultCareer(1, 480, "student", SIM_CATALOG);
    const id = "copilot_inspired" as const;
    expect(agentBuyBlock(state, id)).toMatch(/freelance/);
    state = { ...state, players: { ...state.players, freelance_completed: 1, money: 1_000_000 } };
    expect(agentBuyBlock(state, id)).toBeNull();
    const first = buyAgent(state, id);
    expect(first.error).toBeNull();
    const second = buyAgent(first.state, id);
    expect(second.error).toMatch(/Còn/);
  });
});

describe("agent task path", () => {
  it("keeps bug ids on retry after agent code", () => {
    const base = defaultCareer(3, 480, "student", SIM_CATALOG);
    const withMoney = activeAgents(
      {
        ...base,
        players: { ...base.players, freelance_completed: 2, money: 5_000_000, energy: 80 },
      },
      ["copilot_inspired"],
    );
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

describe("combined agent + manual paths", () => {
  it("agent code then manual fix ends at ready without paying until commit", () => {
    const { state, jobId, runRevision } = seedAgentCodeJob();
    const afterBuild = completeAgentBuild(state, jobId, runRevision);
    const manual = chooseTaskFixer(afterBuild.state, jobId, afterBuild.state.player_jobs[0]!.task_run!.revision, "manual");
    expect(manual.state.player_jobs[0]?.task_run?.step).toBe("test");
    const money = manual.state.players.money;
    const ready = { ...manual.state.player_jobs[0]!.task_run!, step: "ready" as const, revision: 9 };
    const withReady = {
      ...manual.state,
      player_jobs: manual.state.player_jobs.map((j) => (j.id === jobId ? { ...j, task_run: ready } : j)),
    };
    const paid = commitTask(withReady, jobId, SIM_CATALOG, 9);
    expect(paid.error).toBeNull();
    expect(paid.state.players.money).toBeGreaterThan(money);
  });
});

function seedAgentCodeJob() {
  const base = defaultCareer(3, 480, "student", SIM_CATALOG);
  const withMoney = activeAgents(
    {
      ...base,
      players: { ...base.players, freelance_completed: 2, money: 2_000_000, energy: 80 },
    },
    ["claude_inspired"],
  );
  const board = ensureTodayBoard(withMoney, 3, SIM_CATALOG);
  const job = board.state.player_jobs.find((row) => row.status === "offered");
  if (!job) throw new Error("no job");
  const opened = openTaskRun(board.state, job.id, SIM_CATALOG);
  const began = beginTaskRun(opened.state, job.id, { mode: "agent", coderId: "claude_inspired" }, SIM_CATALOG);
  const run = began.state.player_jobs.find((j) => j.id === job.id)!.task_run!;
  const patched = {
    ...began.state,
    player_jobs: began.state.player_jobs.map((j) =>
      j.id === job.id
        ? {
            ...j,
            task_run: {
              ...run,
              bug_ids: ["b0", "b1"],
              bugs_total: 2,
              bugs_caught: 0,
              build_progress: 1,
            },
          }
        : j,
    ),
  };
  return { state: patched, jobId: job.id, runRevision: run.revision };
}

describe("agent time multipliers", () => {
  it("scales build and fix durations per agent m", () => {
    const run = {
      ...freshRun(1),
      ticket: "correct" as const,
      build: "careful" as const,
      build_runner: "agent" as const,
      coder: agentSnapshot("cursor_inspired"),
      build_progress: 0,
    };
    const manualBase = buildRemainingSec({ ...run, coder: null, build_runner: "manual" }, 1, TASK_RUN.events);
    const fast = buildRemainingSec(run, 1, TASK_RUN.events);
    const fixSlow = agentFixTotalSec(1, agentSnapshot("claude_inspired").time_multiplier);
    const fixFast = agentFixTotalSec(1, agentSnapshot("cursor_inspired").time_multiplier);
    expect(fast).toBeLessThan(manualBase);
    expect(fixFast).toBeLessThan(fixSlow);
  });
});

describe("payout gating", () => {
  it("charges energy once on begin and pays only on commit", () => {
    const base = defaultCareer(3, 480, "student", SIM_CATALOG);
    const board = ensureTodayBoard(
      activeAgents(
        {
          ...base,
          players: { ...base.players, energy: 60, freelance_completed: 2, money: 1_000_000 },
        },
        ["copilot_inspired"],
      ),
      3,
      SIM_CATALOG,
    );
    const job = board.state.player_jobs.find((row) => row.status === "offered");
    if (!job) throw new Error("no offered job");
    const opened = openTaskRun(board.state, job.id, SIM_CATALOG);
    expect(opened.error).toBeNull();
    const energyAfterOpen = opened.state.players.energy;
    const began = beginTaskRun(opened.state, job.id, { mode: "agent", coderId: "copilot_inspired" }, SIM_CATALOG);
    expect(began.error).toBeNull();
    expect(began.state.players.energy).toBeLessThan(energyAfterOpen);
    const again = beginTaskRun(began.state, job.id, { mode: "agent", coderId: "copilot_inspired" }, SIM_CATALOG);
    expect(again.error).toMatch(/Đã bắt đầu/);
  });
});

describe("retry energy", () => {
  it("uses scaled retry cost helper", () => {
    const state = defaultCareer(1, 480, "student", SIM_CATALOG);
    expect(retryEnergyCost(state)).toBeGreaterThan(0);
    expect(retryEnergyCost(state)).toBeGreaterThanOrEqual(TASK_RUN.retry_energy);
  });
});
