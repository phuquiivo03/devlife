import { describe, expect, it } from "vitest";
import { defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import { PERSIST_VERSION } from "@/game/config";
import { applyDayStarted } from "@/game/career/actions";
import {
  agentActive,
  agentBuyBlock,
  agentDaysLeft,
  buyAgent,
  grantGraceLicenses,
  licenseDays,
  normalizeAgents,
} from "@/game/agents/logic";
import type { AgentId, AgentsState } from "@/game/agents/types";
import type { CareerState } from "@/game/career/types";
import { migrateSave } from "@/game/storage/migrate";
import {
  beginTaskRun,
  chooseTaskFixer,
  completeAgentBuild,
  commitTask,
  openTaskRun,
} from "@/game/task-run/apply";
import { ensureTodayBoard } from "@/game/career/actions";
import { jobEligibility, skillNameMap } from "@/game/jobs/logic";

function licensed(
  state: ReturnType<typeof defaultCareer>,
  ids: AgentId[],
  day = state.players.game_day,
): typeof state {
  const span = licenseDays();
  const licenses = Object.fromEntries(
    ids.map((id) => [id, { bought_day: day - 1, expires_day: day + span - 1 }]),
  ) as AgentsState["licenses"];
  return { ...state, agents: { owned: ids, licenses } };
}

describe("monthly agent license", () => {
  it("active on purchase day through day d+27, inactive from d+28", () => {
    let state = defaultCareer(10, 480, "student", SIM_CATALOG);
    state = {
      ...state,
      players: { ...state.players, freelance_completed: 1, money: 5_000_000, game_day: 5 },
    };
    const bought = buyAgent(state, "copilot_inspired");
    expect(bought.error).toBeNull();
    const expires = 5 + licenseDays();
    expect(bought.state.agents.licenses.copilot_inspired).toEqual({
      bought_day: 5,
      expires_day: expires,
    });
    const lastActive = { ...bought.state, players: { ...bought.state.players, game_day: expires - 1 } };
    expect(agentActive(lastActive, "copilot_inspired")).toBe(true);
    const expiredDay = { ...bought.state, players: { ...bought.state.players, game_day: expires } };
    expect(agentActive(expiredDay, "copilot_inspired")).toBe(false);
    expect(agentDaysLeft(lastActive, "copilot_inspired")).toBe(1);
  });

  it("blocks purchase while active and allows repurchase after expiry", () => {
    let state = licensed(defaultCareer(3, 480, "student", SIM_CATALOG), ["copilot_inspired"], 3);
    state = { ...state, players: { ...state.players, freelance_completed: 2, money: 2_000_000 } };
    expect(agentBuyBlock(state, "copilot_inspired")).toMatch(/Còn \d+ ngày/);
    const blocked = buyAgent(state, "copilot_inspired");
    expect(blocked.error).toMatch(/Còn/);
    expect(blocked.state.players.money).toBe(2_000_000);
    const expired = {
      ...state,
      players: { ...state.players, game_day: state.agents.licenses.copilot_inspired!.expires_day },
    };
    expect(agentBuyBlock(expired, "copilot_inspired")).toBeNull();
    const again = buyAgent(expired, "copilot_inspired");
    expect(again.error).toBeNull();
    expect(again.state.players.money).toBeLessThan(2_000_000);
    const twice = buyAgent(again.state, "copilot_inspired");
    expect(twice.error).toMatch(/Còn/);
    expect(twice.state.players.money).toBe(again.state.players.money);
  });

  it("expired license hides agent from bug choice but manual still reaches ready", () => {
    const { state, jobId, rev } = seedAtBugChoice();
    const expired = licensed(
      { ...state, players: { ...state.players, game_day: 40 } },
      ["claude_inspired"],
      40,
    );
    const withExpired: typeof expired = {
      ...expired,
      agents: {
        owned: ["claude_inspired"],
        licenses: { claude_inspired: { bought_day: 5, expires_day: 40 } },
      },
    };
    const pick = chooseTaskFixer(withExpired, jobId, rev, "claude_inspired");
    expect(pick.error).toMatch(/hết hạn/);
    const manual = chooseTaskFixer(withExpired, jobId, rev, "manual");
    expect(manual.error).toBeNull();
    const ready = {
      ...manual.state,
      player_jobs: manual.state.player_jobs.map((j) =>
        j.id === jobId ? { ...j, task_run: { ...j.task_run!, step: "ready" as const } } : j,
      ),
    };
    const paid = commitTask(ready, jobId, SIM_CATALOG, ready.player_jobs[0]!.task_run!.revision);
    expect(paid.error).toBeNull();
  });

  it("in-flight agent fix completes after license expiry on same run", () => {
    const { state, jobId, rev } = seedAtBugChoice();
    const fixing = chooseTaskFixer(state, jobId, rev, "claude_inspired");
    expect(fixing.state.player_jobs[0]?.task_run?.step).toBe("agent_fix");
    const mid: CareerState = {
      ...fixing.state,
      players: { ...fixing.state.players, game_day: 99 },
      agents: {
        owned: ["claude_inspired"],
        licenses: { claude_inspired: { bought_day: 1, expires_day: 50 } },
      },
    };
    const ready = {
      ...mid,
      player_jobs: mid.player_jobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              task_run: {
                ...j.task_run!,
                step: "ready" as const,
                fixer_id: "claude_inspired" as const,
              },
            }
          : j,
      ),
    };
    const paid = commitTask(ready, jobId, SIM_CATALOG, ready.player_jobs[0]!.task_run!.revision);
    expect(paid.error).toBeNull();
  });

  it("pushes one expiry notice on day start", () => {
    let state = licensed(defaultCareer(10, 480, "student", SIM_CATALOG), ["copilot_inspired"], 10);
    state = {
      ...state,
      agents: {
        owned: ["copilot_inspired"],
        licenses: { copilot_inspired: { bought_day: 1, expires_day: 10 } },
      },
    };
    const day = applyDayStarted(state, 10, 8 * 60, "student", SIM_CATALOG);
    const flags = day.state.feed.flags.filter((f) => f.startsWith("agent_license_expired:"));
    expect(flags).toHaveLength(1);
    const again = applyDayStarted(day.state, 10, 9 * 60, "student", SIM_CATALOG);
    expect(again.state.feed.flags.filter((f) => f.startsWith("agent_license_expired:"))).toHaveLength(1);
  });

  it("normalizes malformed license data", () => {
    const parsed = normalizeAgents({
      owned: ["copilot_inspired", "nope", "copilot_inspired"],
      licenses: {
        copilot_inspired: { bought_day: 1, expires_day: 29 },
        bad: { bought_day: 1, expires_day: 2 },
        cursor_inspired: { bought_day: "x", expires_day: 9 },
      },
    });
    expect(parsed.owned).toEqual(["copilot_inspired"]);
    expect(parsed.licenses).toEqual({ copilot_inspired: { bought_day: 1, expires_day: 29 } });
  });
});

describe("agents migration v28", () => {
  it("grants grace month for v27 owned without license", () => {
    const career = defaultCareer(7, 480, "student", SIM_CATALOG);
    const blob = migrateSave(
      {
        stage: "student",
        loadouts: { student: {}, junior: {}, senior: {} },
        showCharacter: true,
        totalMinutes: 7 * 24 * 60,
        openingDone: true,
        openingStep: null,
        career: { ...career, agents: { owned: ["copilot_inspired"] } },
      },
      27,
    );
    const day = blob.career.players.game_day;
    expect(blob.career.agents.licenses.copilot_inspired).toEqual({
      bought_day: day,
      expires_day: day + licenseDays(),
    });
    const again = migrateSave(
      {
        stage: "student",
        loadouts: { student: {}, junior: {}, senior: {} },
        showCharacter: true,
        totalMinutes: 7 * 24 * 60,
        openingDone: true,
        openingStep: null,
        career: blob.career,
      },
      27,
    );
    expect(again.career.agents.licenses.copilot_inspired).toEqual(
      blob.career.agents.licenses.copilot_inspired,
    );
    expect(PERSIST_VERSION).toBe(28);
  });

  it("grantGraceLicenses is idempotent when licenses exist", () => {
    const base: AgentsState = {
      owned: ["claude_inspired"],
      licenses: { claude_inspired: { bought_day: 2, expires_day: 30 } },
    };
    expect(grantGraceLicenses(base, 9)).toEqual(base);
  });
});

function seedAtBugChoice() {
  let state = licensed(defaultCareer(3, 480, "student", SIM_CATALOG), ["claude_inspired"], 3);
  state = { ...state, players: { ...state.players, freelance_completed: 2, money: 3_000_000, energy: 80 } };
  const board = ensureTodayBoard(state, 3, SIM_CATALOG);
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
  const began = beginTaskRun(opened.state, boardJob.id, { mode: "agent", coderId: "claude_inspired" }, SIM_CATALOG);
  const built = completeAgentBuild(began.state, boardJob.id, began.state.player_jobs[0]!.task_run!.revision);
  const run = built.state.player_jobs.find((j) => j.id === boardJob.id)!.task_run!;
  const patched = {
    ...built.state,
    player_jobs: built.state.player_jobs.map((j) =>
      j.id === boardJob.id
        ? { ...j, task_run: { ...run, bug_ids: ["only"], bugs_total: 1, bugs_caught: 0 }, bugs: 1 }
        : j,
    ),
  };
  const rev = patched.player_jobs.find((j) => j.id === boardJob.id)!.task_run!.revision;
  return { state: patched, jobId: boardJob.id, rev };
}
