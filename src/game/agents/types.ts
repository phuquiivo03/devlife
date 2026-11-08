export const AGENT_IDS = [
  "claude_inspired",
  "cursor_inspired",
  "copilot_inspired",
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export type AgentCapability = "code" | "fix_bug";

export type AgentDef = {
  id: AgentId;
  name: string;
  chip: string;
  price: number;
  time_multiplier: number;
  bug_survival: number;
  capabilities: readonly AgentCapability[];
};

export type AgentsCatalog = {
  version: number;
  gate_freelance_completed: number;
  intro_sec: number;
  agents: readonly AgentDef[];
};

export type AgentsState = {
  owned: AgentId[];
};

export type AgentSnapshot = {
  id: AgentId;
  time_multiplier: number;
  bug_survival: number;
  catalog_version: number;
};
