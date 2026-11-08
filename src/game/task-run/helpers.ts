import type { SkillId, SimCatalog } from "../career/types";
import type { TaskTicket } from "./types";

export function ticketForSkill(skillId: SkillId, tickets: readonly TaskTicket[]): TaskTicket | null {
  return tickets.find((row) => row.skill_id === skillId) ?? tickets[0] ?? null;
}

export function primarySkillId(templateId: string, catalog: SimCatalog): SkillId {
  const grant = catalog.jobTemplateXp.find((row) => row.template_id === templateId);
  return grant?.skill_id ?? "frontend";
}
