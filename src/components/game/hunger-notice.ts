import type { LifeNotice } from "@/game/career/types";

/**
 * True when a row is a No bụng reminder from `tickFullness`.
 *
 * That writer is the only one that sets action `eat`. Its ids are
 * `fullness-hungry-<day>-<mealsToday>` and `fullness-starving-<day>-<mealsToday>`;
 * pre-v20 saves keep the old `hunger-<day>-<mealsToday>` rows. `LifeNotice`
 * has no kind, type, or source. The icon and severity are shared with other
 * rows, so they are not used. Either stable field is enough: action `eat`
 * still matches if the id format changes, and the id prefixes still match if
 * the action was cleared. The low Sức khỏe row is action `sleep` with id
 * `sick-<day>`.
 */
export function isHungerNotice(notice: Pick<LifeNotice, "id" | "action">): boolean {
  return notice.action === "eat" || notice.id.startsWith("fullness-") || notice.id.startsWith("hunger-");
}
