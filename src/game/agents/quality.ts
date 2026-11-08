import { mulberry32, qualitySeed } from "../task-run/formula";
import type { AgentId } from "./types";
import type { AgentSnapshot } from "./types";

/** Deterministic U_i in [0,1) for potential bug index i. */
export function qualityRoll(seed: number, coderId: AgentId, index: number): number {
  return mulberry32(qualitySeed(seed, coderId, index))();
}

export function survivingBugIds(seed: number, snapshot: AgentSnapshot, B: number): string[] {
  if (B <= 0) return [];
  const out: string[] = [];
  for (let i = 0; i < B; i++) {
    if (qualityRoll(seed, snapshot.id, i) < snapshot.bug_survival) {
      out.push(`b${i}`);
    }
  }
  return out;
}
