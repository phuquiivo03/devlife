import type { GameEvent } from "../events/types";
import {
  addSkillXp,
  canStudyCourse,
  grantedXp,
  skillXpEvents,
} from "../knowledge/logic";
import { MINUTES_PER_DAY } from "../time/config";
import { advanceMinutes, snapshot } from "../time";
import {
  boardHasToday,
  jobEligibility,
  jobRequirementsFor,
  offerJob,
  selectBoardTemplates,
  skillNameMap,
} from "../jobs/logic";
import { notePurse } from "../life/purse";
import { applyMoney, clampEnergy } from "../vitals/logic";
import { LIFE } from "../life/content";
import { defaultFeed } from "../life/events";
import { defaultShop, scaleWorkXp } from "../life/furniture";
import { MIGRATION_TRAIT, scaleTraitXp, type TraitId } from "../life/traits";
import { defaultEmployment, fulltimeDayStart } from "../jobs/fulltime";
import {
  applyActionStats,
  applyLifeDayStart,
  applySleepRest,
  defaultLife,
  energyCost,
  lifeOf,
  markWorked,
  resolveMorning,
  scaleXpForMood,
} from "../life/logic";
import {
  LOCAL_PLAYER_ID,
  SKILL_IDS,
  type CareerState,
  type PlayerEvent,
  type PlayerJob,
  type PlayerSkill,
  type PlayerStudyCompletion,
  type SimCatalog,
  type SkillId,
} from "./types";

export type ActionResult = {
  state: CareerState;
  events: GameEvent[];
  minutes: number;
  error: string | null;
  /** Hospital asks the clock to jump this many days. */
  skipDays?: number;
};

function draft(state: CareerState, events: GameEvent[], minutes = 0): ActionResult {
  return { state, events, minutes, error: null };
}

function ok(state: CareerState, events: GameEvent[], minutes = 0): ActionResult {
  return { state: withEvents(state, events), events, minutes, error: null };
}

function fail(state: CareerState, error: string): ActionResult {
  return { state, events: [], minutes: 0, error };
}

function withEvents(state: CareerState, events: readonly GameEvent[]): CareerState {
  if (events.length === 0) return state;
  const start = state.player_events.length;
  const appended: PlayerEvent[] = events.map((event, index) => {
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event)) {
      if (key !== "type") payload[key] = value;
    }
    return {
      id: `e-${start + index + 1}`,
      type: event.type,
      day: state.players.game_day,
      payload,
    };
  });
  return { ...state, player_events: [...state.player_events, ...appended] };
}

export function defaultCareer(
  day: number,
  minuteOfDay: number,
  stage: string,
  catalog: SimCatalog,
  trait: TraitId = MIGRATION_TRAIT,
): CareerState {
  const { config } = catalog;
  return {
    players: {
      id: LOCAL_PLAYER_ID,
      stage,
      game_day: day,
      game_minute: minuteOfDay,
      money: config.starting_money,
      energy: clampEnergy(config.starting_energy, config.energy_max),
      health: LIFE.starting_health,
      mood: LIFE.starting_mood,
      fullness: LIFE.fullness_max,
      reputation: config.starting_reputation,
      freelance_completed: 0,
      trait,
      traitRolled: true,
      introSeen: false,
    },
    player_skills: SKILL_IDS.map((skill_id) => ({ skill_id, level: 1, xp: 0 })),
    player_study_completions: [],
    player_jobs: [],
    player_unlocks: [],
    player_events: [],
    life: defaultLife(day),
    shop: defaultShop(),
    employment: defaultEmployment(),
    feed: defaultFeed({
      day,
      money: config.starting_money,
      xp: 0,
      health: LIFE.starting_health,
      mood: LIFE.starting_mood,
      energy: clampEnergy(config.starting_energy, config.energy_max),
    }),
  };
}

export function syncPlayerClock(
  state: CareerState,
  day: number,
  minuteOfDay: number,
  stage: string,
): CareerState {
  return {
    ...state,
    players: {
      ...state.players,
      stage,
      game_day: day,
      game_minute: minuteOfDay,
    },
  };
}

function skillById(skills: readonly PlayerSkill[], skillId: SkillId): PlayerSkill {
  return (
    skills.find((row) => row.skill_id === skillId) ?? {
      skill_id: skillId,
      level: 1,
      xp: 0,
    }
  );
}

function replaceSkill(skills: readonly PlayerSkill[], next: PlayerSkill): PlayerSkill[] {
  const exists = skills.some((row) => row.skill_id === next.skill_id);
  if (!exists) return [...skills, next];
  return skills.map((row) => (row.skill_id === next.skill_id ? next : row));
}

function setEnergy(state: CareerState, target: number, max: number): ActionResult {
  const energy = clampEnergy(target, max);
  const current = state.players.energy;
  if (current === energy) return draft(state, []);
  return draft(
    { ...state, players: { ...state.players, energy } },
    [{ type: "energyChanged", delta: energy - current, energy }],
  );
}

export function refreshBoard(state: CareerState, day: number, catalog: SimCatalog): ActionResult {
  const expired: PlayerJob[] = state.player_jobs.map((job) =>
    job.status === "offered" && job.offered_day < day && job.source !== "company"
      ? { ...job, status: "expired" }
      : job,
  );
  if (boardHasToday(expired, day)) {
    return draft({ ...state, player_jobs: expired }, []);
  }

  const names = skillNameMap(catalog.skills);
  const picked = selectBoardTemplates(
    catalog.jobTemplates,
    day,
    catalog.config.board_size,
    (template) =>
      jobEligibility(
        state.players,
        state.player_skills,
        template,
        jobRequirementsFor(template.id, catalog.jobTemplateRequirements),
        names,
      ).ok,
  );
  const offered = picked.map((template) => offerJob(template, day));
  const events: GameEvent[] = [
    {
      type: "jobBoardRefreshed",
      day,
      jobIds: offered.map((job) => job.id),
    },
  ];
  return draft({ ...state, player_jobs: [...expired, ...offered] }, events);
}

export function ensureTodayBoard(
  state: CareerState,
  day: number,
  catalog: SimCatalog,
): ActionResult {
  const board = refreshBoard(state, day, catalog);
  return ok(board.state, board.events);
}

export function applyDayStarted(
  state: CareerState,
  day: number,
  minuteOfDay: number,
  stage: string,
  catalog: SimCatalog,
  options?: { resolveMorning?: boolean },
): ActionResult {
  const lived = applyLifeDayStart(state, day, stage, {
    resolveMorning: options?.resolveMorning ?? minuteOfDay === 6 * 60,
  });
  const synced = syncPlayerClock(lived.state, day, minuteOfDay, stage);
  const fulltime = fulltimeDayStart(synced, day, minuteOfDay, catalog);
  const board = refreshBoard(fulltime, day, catalog);
  return {
    ...ok(board.state, [...lived.events, ...board.events]),
    skipDays: lived.skipDays,
  };
}

/**
 * Sleep recovery from hours asleep. Energy is not set to `energyOnSleep`.
 * The morning mood queue is applied when the wake lands at 06:00.
 */
export function applyWake(state: CareerState, hoursSlept: number): ActionResult {
  const rested = applySleepRest(state, hoursSlept);
  if (rested.skipDays > 0) {
    return { state: rested.state, events: rested.events, minutes: 0, error: null, skipDays: rested.skipDays };
  }
  const morning = resolveMorning(rested.state, rested.state.players.game_day);
  return {
    state: morning.state,
    events: [...rested.events, ...morning.events],
    minutes: 0,
    error: null,
    skipDays: morning.skipDays,
  };
}

function grantToSkill(
  state: CareerState,
  skillId: SkillId,
  amount: number,
  catalog: SimCatalog,
): { state: CareerState; events: GameEvent[] } {
  const scaled = scaleXpForMood(amount, state.players.mood);
  if (scaled <= 0) return { state, events: [] };
  const current = skillById(state.player_skills, skillId);
  const applied = addSkillXp(current, scaled, catalog.skillLevelXp);
  const events = skillXpEvents(skillId, applied, catalog.config.rank_brackets);
  return {
    state: {
      ...state,
      player_skills: replaceSkill(state.player_skills, applied.skill),
    },
    events,
  };
}

export function applyStudy(
  state: CareerState,
  activityId: string,
  catalog: SimCatalog,
  force = false,
): ActionResult {
  const activity = catalog.studyActivities.find((row) => row.id === activityId);
  if (!activity) return fail(state, "Không tìm thấy khóa học");

  const completions = state.player_study_completions ?? [];
  if (!canStudyCourse(activity, completions)) return fail(state, "Đã học khóa này");

  const cost = energyCost(activity.energy, lifeOf(state).workStreak);
  const broke = state.players.money < activity.price;
  const tired = state.players.energy < cost;
  if (broke && tired) return fail(state, "Không đủ tiền và năng lượng");
  if (broke) return fail(state, "Không đủ tiền");
  if (tired && !force) return fail(state, "Không đủ năng lượng");

  const spent = applyActionStats(state, {
    money: -activity.price,
    energy: -activity.energy,
    health: force && tired ? LIFE.force_health : 0,
  });
  let next = notePurse(markWorked(spent.state), -activity.price, "other");
  const events: GameEvent[] = [...spent.events];

  const grants = catalog.studyActivityXp.filter((row) => row.activity_id === activity.id);
  let xpShown = 0;
  for (const grant of grants) {
    const skill = skillById(next.player_skills, grant.skill_id);
    const amount = scaleWorkXp(
      scaleTraitXp(grantedXp(grant.xp, skill.level, "study", catalog.config), next, grant.skill_id, "study"),
      next,
    );
    const applied = grantToSkill(next, grant.skill_id, amount, catalog);
    next = applied.state;
    events.push(...applied.events);
    xpShown += applied.events.reduce(
      (sum, event) => (event.type === "skillXpGained" ? sum + event.amount : sum),
      0,
    );
  }
  const minutes = activity.hours * 60;
  const completion: PlayerStudyCompletion = {
    activity_id: activity.id,
    skill_id: activity.skill_id,
    xp_gained: xpShown,
    completed_day: studyCompletedDay(state, minutes),
  };
  next = {
    ...next,
    player_study_completions: [
      ...completions.filter((row) => row.activity_id !== activity.id),
      completion,
    ],
  };
  events.push({
    type: "studyCompleted",
    activityId: activity.id,
    skillId: activity.skill_id,
    xp: xpShown,
  });

  return { ...ok(next, events, minutes), skipDays: spent.skipDays };
}

/** Day the clock shows after the course hours, using the same advance as the store. */
function studyCompletedDay(state: CareerState, minutes: number): number {
  const start =
    (state.players.game_day - 1) * MINUTES_PER_DAY + state.players.game_minute;
  return snapshot(advanceMinutes(start, minutes).totalMinutes).day;
}

export { applyAccept } from "../task-run/apply";

/** Debug helper. `amount` is final XP, not multiplied again. */
export function grantRawXp(
  state: CareerState,
  skillId: SkillId,
  amount: number,
  catalog: SimCatalog,
): ActionResult {
  const applied = grantToSkill(state, skillId, amount, catalog);
  return ok(applied.state, applied.events);
}

export function changeMoney(state: CareerState, delta: number): ActionResult {
  const money = applyMoney(state.players.money, delta);
  if (money === state.players.money) return ok(state, []);
  const applied = money - state.players.money;
  return ok(
    notePurse({ ...state, players: { ...state.players, money } }, applied, applied > 0 ? "earn" : "other"),
    [{ type: "moneyChanged", delta: applied, money }],
  );
}

export function fillEnergy(state: CareerState, catalog: SimCatalog): ActionResult {
  const filled = setEnergy(state, catalog.config.energy_max, catalog.config.energy_max);
  return ok(filled.state, filled.events);
}

export function xpNeededForNextLevel(
  state: CareerState,
  skillId: SkillId,
  catalog: SimCatalog,
): number {
  const skill = skillById(state.player_skills, skillId);
  const need = catalog.skillLevelXp.find((row) => row.level === skill.level)?.xp_to_next ?? 0;
  if (need <= 0) return 0;
  return Math.max(0, need - skill.xp);
}
