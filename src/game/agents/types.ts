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
  license_days: number;
  intro_sec: number;
  agents: readonly AgentDef[];
};

export type AgentLicenseRecord = {
  bought_day: number;
  expires_day: number;
};

export type AgentsState = {
  owned: AgentId[];
  licenses: Partial<Record<AgentId, AgentLicenseRecord>>;
};

export type AgentSnapshot = {
  id: AgentId;
  time_multiplier: number;
  bug_survival: number;
  catalog_version: number;
};
