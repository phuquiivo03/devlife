import type { ActionResult } from "../career/actions";
import type { CareerState, PlayerJob } from "../career/types";
import { NOTICE_ACTION_DEFAULT_LABEL } from "../career/types";
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
import type { AgentId, AgentLicenseRecord, AgentsState, AgentSnapshot } from "./types";
import { survivingBugIds } from "./quality";

export function licenseDays(): number {
  const fromConfig = AGENTS.license_days;
  return Number.isFinite(fromConfig) && fromConfig > 0 ? fromConfig : 28;
}

export function agentsOf(state: CareerState): AgentsState {
  return state.agents ?? defaultAgentsState();
}

/** Ever purchased (history + owned tab). */
export function ownsAgent(state: CareerState, id: AgentId): boolean {
  return agentsOf(state).owned.includes(id);
}

export function agentLicense(state: CareerState, id: AgentId): AgentLicenseRecord | null {
  const row = agentsOf(state).licenses[id];
  if (!row || typeof row.bought_day !== "number" || typeof row.expires_day !== "number") return null;
  if (!Number.isFinite(row.bought_day) || !Number.isFinite(row.expires_day)) return null;
  return row;
}

export function agentActive(state: CareerState, id: AgentId): boolean {
  const lic = agentLicense(state, id);
  if (!lic) return false;
  return state.players.game_day < lic.expires_day;
}

export function agentDaysLeft(state: CareerState, id: AgentId): number {
  const lic = agentLicense(state, id);
  if (!lic) return 0;
  return Math.max(0, lic.expires_day - state.players.game_day);
}

export function agentLicenseExpired(state: CareerState, id: AgentId): boolean {
  return ownsAgent(state, id) && !agentActive(state, id);
}

export function agentShopUnlocked(state: CareerState): boolean {
  return state.players.freelance_completed >= AGENTS.gate_freelance_completed;
}

export function agentBuyBlock(state: CareerState, id: string): string | null {
  const def = agentById(id);
  if (!def) return "Không có agent này.";
  if (!agentShopUnlocked(state)) return "Hoàn thành 1 việc freelance để mở.";
  const agentId = id as AgentId;
  if (agentActive(state, agentId)) {
    const left = agentDaysLeft(state, agentId);
    return `Còn ${left} ngày`;
  }
  if (state.players.money < def.price) return "Không đủ tiền.";
  return null;
}

export function buyAgent(state: CareerState, id: string): ActionResult {
  const block = agentBuyBlock(state, id);
  if (block) {
    return { state, events: [], minutes: 0, error: block };
  }
  const def = agentById(id)!;
  const agentId = def.id;
  const agents = agentsOf(state);
  const day = state.players.game_day;
  const expires = day + licenseDays();
  const owned = agents.owned.includes(agentId) ? agents.owned : [...agents.owned, agentId];
  const spent = applyActionStats(state, { money: -def.price });
  const next: CareerState = notePurse(
    {
      ...spent.state,
      agents: {
        owned,
        licenses: {
          ...agents.licenses,
          [agentId]: { bought_day: day, expires_day: expires },
        },
      },
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

export function anyAgentActive(state: CareerState): boolean {
  return AGENTS.agents.some((row) => agentActive(state, row.id as AgentId));
}

/** @deprecated Use anyAgentActive for gating; kept for tests naming compat. */
export function anyAgentOwned(state: CareerState): boolean {
  return anyAgentActive(state);
}

export function applyAgentLicenseExpiryNotices(state: CareerState, day: number): CareerState {
  const feed = state.feed;
  let notices = feed.notices;
  let flags = feed.flags;
  let changed = false;

  for (const def of AGENTS.agents) {
    const id = def.id as AgentId;
    const lic = agentLicense(state, id);
    if (!lic || lic.expires_day !== day) continue;
    const flag = `agent_license_expired:${id}:${lic.expires_day}`;
    if (flags.includes(flag)) continue;
    changed = true;
    flags = [...flags, flag];
    notices = [
      ...notices,
      {
        id: `agent-expiry-${id}-${lic.expires_day}`,
        day,
        minute: state.players.game_minute,
        severity: "info" as const,
        icon: "icon_action_open_store",
        text: `License ${def.name} đã hết hạn — mua lại trong Cửa hàng`,
        action: "openStore" as const,
        actions: [
          { id: "openStore" as const, label: NOTICE_ACTION_DEFAULT_LABEL.openStore, variant: "primary" as const },
        ],
        read: false,
        cue: null,
        payload: {},
      },
    ].slice(-50);
  }

  if (!changed) return state;
  return { ...state, feed: { ...feed, notices, flags } };
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

function parseLicenseRecord(raw: unknown): AgentLicenseRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { bought_day?: unknown; expires_day?: unknown };
  if (typeof row.bought_day !== "number" || typeof row.expires_day !== "number") return null;
  if (!Number.isFinite(row.bought_day) || !Number.isFinite(row.expires_day)) return null;
  if (row.expires_day <= row.bought_day) return null;
  return { bought_day: Math.floor(row.bought_day), expires_day: Math.floor(row.expires_day) };
}

export function normalizeAgents(value: unknown): AgentsState {
  if (!value || typeof value !== "object") return defaultAgentsState();
  const raw = value as { owned?: unknown; licenses?: unknown };
  const owned: AgentId[] = [];
  if (Array.isArray(raw.owned)) {
    for (const id of raw.owned) {
      if (isAgentId(id) && !owned.includes(id)) owned.push(id);
    }
  }
  const licenses: Partial<Record<AgentId, AgentLicenseRecord>> = {};
  if (raw.licenses && typeof raw.licenses === "object") {
    for (const [key, lic] of Object.entries(raw.licenses as Record<string, unknown>)) {
      if (!isAgentId(key)) continue;
      const parsed = parseLicenseRecord(lic);
      if (parsed) licenses[key] = parsed;
    }
  }
  return { owned, licenses };
}

/** v28 migration: one grace month for owned agents missing a license row. */
export function grantGraceLicenses(agents: AgentsState, gameDay: number): AgentsState {
  const days = licenseDays();
  const expires = gameDay + days;
  const licenses: Partial<Record<AgentId, AgentLicenseRecord>> = { ...agents.licenses };
  for (const id of agents.owned) {
    if (licenses[id]) continue;
    licenses[id] = { bought_day: gameDay, expires_day: expires };
  }
  return { owned: agents.owned, licenses };
}
