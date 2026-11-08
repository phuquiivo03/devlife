import agentsConfig from "../../../config/agents.json";
import type { AgentId, AgentsCatalog, AgentDef, AgentsState } from "./types";
import { AGENT_IDS } from "./types";

export const AGENTS = agentsConfig as AgentsCatalog;

const byId = new Map<AgentId, AgentDef>(
  AGENTS.agents.map((row) => [row.id as AgentId, row as AgentDef]),
);

export function agentById(id: string): AgentDef | null {
  return byId.get(id as AgentId) ?? null;
}

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === "string" && (AGENT_IDS as readonly string[]).includes(value);
}

export function agentIconPath(id: AgentId, size: 64 | 256 | 512): string {
  return `/icons/agents/agent_${id}_${size}.png`;
}

export function defaultAgentsState(): AgentsState {
  return { owned: [], licenses: {} };
}
