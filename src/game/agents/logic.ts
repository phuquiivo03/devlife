import type { ActionResult } from "../career/actions";
import type { CareerState, PlayerJob } from "../career/types";
import { notePurse } from "../life/purse";
import { applyActionStats } from "../life/logic";
import { jobEnergyFactor } from "../life/furniture";
import { energyCost, lifeOf } from "../life/logic";
import { TASK_RUN } from "../task-run/content";
import { bugCount } from "../task-run/formula";
import { retryEnergyCost as retryEnergyCostTiming } from "../task-run/timing";
import { traitBugCount } from "../life/traits";
import { takePendingBugDelta } from "../life/events";
import { moodBugBonus } from "../life/logic";
import { primarySkillId, ticketForSkill } from "../task-run/helpers";
import type { SimCatalog } from "../career/types";
import { AGENTS, agentById, defaultAgentsState, isAgentId } from "./content";
import type { AgentId, AgentsState, AgentSnapshot } from "./types";
import { survivingBugIds } from "./quality";

export function agentsOf(state: CareerState): AgentsState {
  return state.agents ?? defaultAgentsState();
}

export function ownsAgent(state: CareerState, id: AgentId): boolean {
  return agentsOf(state).owned.includes(id);
}

export function agentShopUnlocked(state: CareerState): boolean {
  return state.players.freelance_completed >= AGENTS.gate_freelance_completed;
}

export function agentBuyBlock(state: CareerState, id: string): string | null {
  const def = agentById(id);
  if (!def) return "Không có agent này.";
  if (!agentShopUnlocked(state)) return "Hoàn thành 1 việc freelance để mở.";
  if (ownsAgent(state, id as AgentId)) return "Đã có.";
  if (state.players.money < def.price) return "Không đủ tiền.";
  return null;
}

export function buyAgent(state: CareerState, id: string): ActionResult {
  const block = agentBuyBlock(state, id);
  if (block) {
    return { state, events: [], minutes: 0, error: block };
  }
  const def = agentById(id)!;
  const agents = agentsOf(state);
  if (agents.owned.includes(def.id)) {
    return { state, events: [], minutes: 0, error: "Đã có." };
  }
  const spent = applyActionStats(state, { money: -def.price });
  const next: CareerState = notePurse(
    {
      ...spent.state,
      agents: { owned: [...agents.owned, def.id] },
    },
    -def.price,
    "shop",
  );
  return {
    state: next,
    events: spent.events,
    minutes: 0,
    error: null,
  };
}

export function agentSnapshot(id: AgentId): AgentSnapshot {
  const def = agentById(id)!;
  return {
    id: def.id,
    time_multiplier: def.time_multiplier,
    bug_survival: def.bug_survival,
    catalog_version: AGENTS.version,
  };
}

export function anyAgentOwned(state: CareerState): boolean {
  return agentsOf(state).owned.length > 0;
}

export function retryEnergyCost(state: CareerState): number {
  const life = lifeOf(state);
  return retryEnergyCostTiming(
    TASK_RUN.retry_energy,
    jobEnergyFactor(state),
    life.workStreak,
    energyCost,
  );
}

function potentialBForJob(
  state: CareerState,
  job: PlayerJob,
  catalog: SimCatalog,
  ticket: "correct" | "wrong" | "ask",
  build: "careful" | "rushed",
  eventBugDelta: number,
): number {
  const skillId = primarySkillId(job.template_id, catalog);
  const ticketRow = ticketForSkill(skillId, TASK_RUN.tickets);
  const skill = state.player_skills.find((row) => row.skill_id === skillId) ?? {
    skill_id: skillId,
    level: 1,
    xp: 0,
  };
  return traitBugCount(
    bugCount({
      skillLevel: skill.level,
      difficulty: ticketRow?.difficulty ?? 1,
      ticket,
      build,
      eventBugDelta,
      formula: TASK_RUN.bugs,
    }),
    state,
    TASK_RUN.bugs,
  );
}

/** Preview stats for picker; does not consume pending bug delta or roll events. */
export function agentPreview(
  state: CareerState,
  job: PlayerJob,
  agentId: AgentId,
  catalog: SimCatalog,
): {
  codeSec: number;
  fixAllSec: number;
  pAnyMin: number;
  pAnyMax: number;
  eNMin: number;
  eNMax: number;
  energyCost: number;
} {
  const def = agentById(agentId)!;
  const template = catalog.jobTemplates.find((row) => row.id === job.template_id);
  const energy = (template?.energy ?? 0) * jobEnergyFactor(state);
  const peekDelta = state.feed?.nextBugDelta ?? 0;
  const mood = moodBugBonus(state.players.mood);

  const eventDeltas = [0, ...TASK_RUN.events.map((e) => e.bug_delta)];
  let pAnyMin = 1;
  let pAnyMax = 0;
  let eNMin = 0;
  let eNMax = 0;

  for (const ed of eventDeltas) {
    const B = potentialBForJob(state, job, catalog, "correct", "careful", ed + mood + peekDelta);
    const q = def.bug_survival;
    const pAny = B > 0 ? 1 - (1 - q) ** B : 0;
    const eN = B * q;
    pAnyMin = Math.min(pAnyMin, pAny);
    pAnyMax = Math.max(pAnyMax, pAny);
    eNMin = Math.min(eNMin, eN);
    eNMax = Math.max(eNMax, eN);
  }

  const pre = TASK_RUN.build_sec + TASK_RUN.careful_extra_sec * (1 - TASK_RUN.choice_at);
  const codeSec = AGENTS.intro_sec + pre * def.time_multiplier;
  const fixAllSec = TASK_RUN.test_sec * def.time_multiplier;

  return {
    codeSec,
    fixAllSec,
    pAnyMin,
    pAnyMax,
    eNMin,
    eNMax,
    energyCost: energy,
  };
}

export function filterBugsForAgent(
  seed: number,
  snapshot: AgentSnapshot,
  B: number,
): string[] {
  return survivingBugIds(seed, snapshot, B);
}

export function normalizeAgents(value: unknown): AgentsState {
  if (!value || typeof value !== "object") return defaultAgentsState();
  const raw = value as { owned?: unknown };
  const owned: AgentId[] = [];
  if (Array.isArray(raw.owned)) {
    for (const id of raw.owned) {
      if (isAgentId(id) && !owned.includes(id)) owned.push(id);
    }
  }
  return { owned };
}
