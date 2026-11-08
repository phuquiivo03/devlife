/** Emit a devlife:v1 persist blob for agent UI smoke screenshots. */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defaultCareer } from "@/game/career/actions";
import { SIM_CATALOG } from "@/game/career/content";
import type { PlayerJob, TaskRun } from "@/game/career/types";
import { PERSIST_VERSION } from "@/game/config";
import { agentSnapshot } from "@/game/agents/logic";
import { filterBugsForAgent } from "@/game/agents/logic";
import { freshRun } from "@/game/task-run/machine";
import { migrateSave } from "@/game/storage/migrate";
import { offerJob } from "@/game/jobs/logic";

const template = SIM_CATALOG.jobTemplates[0]!;

function job(id: string, partial: Partial<PlayerJob> & { task_run?: TaskRun | null }): PlayerJob {
  const base = offerJob(template, 3);
  return {
    ...base,
    id,
    status: "active",
    accepted_day: 3,
    deadline_day: 5,
    pay: 200_000,
    ...partial,
  };
}

function bugChoiceRun(bugIds: string[], seed: number): TaskRun {
  return {
    ...freshRun(seed),
    step: "bug_choice",
    start_paid: true,
    mode: "agent",
    ticket: "correct",
    build: "careful",
    build_runner: "agent",
    coder: agentSnapshot("claude_inspired"),
    bug_ids: bugIds,
    fixed_bug_ids: [],
    bugs_total: bugIds.length,
    bugs_caught: 0,
    build_progress: 1,
  };
}

const readyRun: TaskRun = {
  ...freshRun(99),
  step: "ready",
  start_paid: true,
  mode: "manual",
  ticket: "correct",
  build: "careful",
  bug_ids: [],
  fixed_bug_ids: [],
  bugs_total: 0,
  bugs_caught: 0,
  build_progress: 1,
};

const selectRun = freshRun(7);

let career = defaultCareer(3, 8 * 60, "student", SIM_CATALOG);
career = {
  ...career,
  feed: {
    ...career.feed,
    storeAsked: true,
    notices: [
      {
        id: "e2e-open-store",
        day: 3,
        minute: 480,
        severity: "info" as const,
        icon: "icon_action_open_store",
        text: "Mở cửa hàng AI (smoke)",
        action: "openStore" as const,
        actions: [{ id: "openStore" as const, label: "Mở store", variant: "primary" as const }],
        read: false,
        cue: null,
        payload: {},
      },
    ],
  },
  players: {
    ...career.players,
    freelance_completed: 3,
    money: 3_500_000,
    energy: 75,
    introSeen: true,
    introVideoSeen: true,
    name: "Smoke",
  },
  agents: { owned: ["copilot_inspired", "claude_inspired"] },
  player_jobs: [
    job("smoke-select", { task_run: selectRun }),
    job("smoke-bugs", { task_run: bugChoiceRun(["b0", "b1", "b2"], 42), bugs: 3 }),
    job("smoke-fix-1bug", { task_run: bugChoiceRun(["only"], 51), bugs: 1 }),
    job("smoke-fix-3bug", { task_run: bugChoiceRun(["b0", "b1", "b2"], 52), bugs: 3 }),
    job("smoke-ready", { task_run: readyRun }),
  ],
};

const totalMinutes = 3 * 24 * 60 + 8 * 60;
const naive = {
  stage: "student" as const,
  loadouts: { student: {}, junior: {}, senior: {} },
  showCharacter: true,
  totalMinutes,
  openingStep: null,
  openingDone: true,
  career,
};

const migrated = migrateSave(naive, PERSIST_VERSION);
const outDir = join(process.cwd(), "tests/e2e/fixtures");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "agent-smoke-persist.json"),
  JSON.stringify({ version: PERSIST_VERSION, state: migrated }),
);

const B = 4;
const snap = agentSnapshot("claude_inspired");
const noBugSeed = 2024;
const filtered = filterBugsForAgent(noBugSeed, snap, B);
writeFileSync(
  join(outDir, "agent-smoke-meta.json"),
  JSON.stringify({ noBugSeed, filteredLength: filtered.length, snapQ: snap.bug_survival }),
);

console.log("Wrote agent-smoke-persist.json", { jobs: career.player_jobs.length });
