import type { GameEvent } from "../events/types";
import { rankBracketForLevel } from "../knowledge/logic";
import type { RankBracket } from "../career/types";
import type { PhaseId } from "../time/config";
import type { TimeEvent } from "../time/types";
import { resolveCueId } from "./manifest";

/** One lo-fi loop per phase (same key and motif, so phase crossfades stay smooth). */
export const BGM_PHASE_IDS: Record<PhaseId, string> = {
  morning: "bgm_morning",
  noon: "bgm_afternoon",
  evening: "bgm_evening",
  night: "bgm_night",
};

export type BgmBed = PhaseId;

/** Each phase has its own bed. */
export function bgmBedForPhase(phase: PhaseId): BgmBed {
  return phase;
}

export function bgmIdForPhase(phase: PhaseId): string {
  return BGM_PHASE_IDS[phase];
}

/** Every phase change crossfades to that phase's loop. */
export function shouldCrossfadeBgm(from: PhaseId, to: PhaseId): boolean {
  return bgmBedForPhase(from) !== bgmBedForPhase(to);
}

export type CueKey =
  | "phaseMorning"
  | "phaseNoon"
  | "phaseEvening"
  | "phaseNight"
  | "phase"
  | "timeSkip"
  | "sleep"
  | "dayStarted"
  | "jobAccepted"
  | "jobCompleted"
  | "jobFailed"
  | "xp"
  | "levelUp"
  | "rankUp"
  | "milestone"
  | "moneyIn"
  | "moneyOut"
  | "course"
  | "click"
  | "hover"
  | "panelOpen"
  | "panelClose"
  | "tab"
  | "locked"
  | "toast"
  | "energyLow"
  | "energyRestored"
  | "typingLoop"
  | "typingLoopFast"
  | "eventOpen"
  | "notifInfo"
  | "notifWarn"
  | "notifUrgent"
  | "landlordKnock"
  | "salary"
  | "diaryFlip"
  | "sickCough"
  | "storeBuy"
  | "ambulance";

export const CUE_KEYS = [
  "phaseMorning",
  "phaseNoon",
  "phaseEvening",
  "phaseNight",
  "phase",
  "timeSkip",
  "sleep",
  "dayStarted",
  "jobAccepted",
  "jobCompleted",
  "jobFailed",
  "xp",
  "levelUp",
  "rankUp",
  "milestone",
  "moneyIn",
  "moneyOut",
  "course",
  "click",
  "hover",
  "panelOpen",
  "panelClose",
  "tab",
  "locked",
  "toast",
  "energyLow",
  "energyRestored",
  "typingLoop",
  "typingLoopFast",
  "eventOpen",
  "notifInfo",
  "notifWarn",
  "notifUrgent",
  "landlordKnock",
  "salary",
  "diaryFlip",
  "sickCough",
  "storeBuy",
  "ambulance",
] as const satisfies readonly CueKey[];

/**
 * Manifest ids tried in order. The pack is the source of truth: a key with
 * no matching id is silent. Aliases cover likely spellings; exact ids win first.
 */
/** Ids from `public/audio/manifest.json`. A missing id stays silent. */
export const CUE_IDS: Record<CueKey, readonly string[]> = {
  phaseMorning: ["sfx_phase_morning"],
  phaseNoon: ["sfx_phase_noon"],
  phaseEvening: ["sfx_phase_evening"],
  phaseNight: ["sfx_phase_night"],
  phase: ["sfx_phase_morning"],
  timeSkip: ["sfx_time_skip"],
  sleep: ["sfx_sleep"],
  dayStarted: ["sfx_day_summary"],
  jobAccepted: ["sfx_job_accepted"],
  jobCompleted: ["sfx_job_complete"],
  jobFailed: ["sfx_job_failed"],
  xp: ["sfx_xp_gain"],
  levelUp: ["sfx_skill_levelup"],
  rankUp: ["sfx_tier_up"],
  milestone: ["sfx_freelance_milestone"],
  moneyIn: ["sfx_money_gain"],
  moneyOut: ["sfx_money_spend"],
  course: ["sfx_ui_purchase_confirm"],
  click: ["sfx_ui_click"],
  hover: ["sfx_ui_hover"],
  panelOpen: ["sfx_ui_panel_open"],
  panelClose: ["sfx_ui_panel_close"],
  tab: ["sfx_ui_tab_switch"],
  locked: ["sfx_ui_locked_denied"],
  toast: ["sfx_ui_toast"],
  energyLow: ["sfx_energy_low"],
  energyRestored: ["sfx_energy_restored"],
  typingLoop: ["sfx_typing_loop"],
  typingLoopFast: ["sfx_typing_loop_fast"],
  /** Important-day banner, and a choice or buff event opening. */
  eventOpen: ["sfx_event_open"],
  notifInfo: ["sfx_notif_info"],
  notifWarn: ["sfx_notif_warn"],
  notifUrgent: ["sfx_notif_urgent"],
  landlordKnock: ["sfx_landlord_knock"],
  salary: ["sfx_salary"],
  diaryFlip: ["sfx_diary_flip"],
  sickCough: ["sfx_sick_cough"],
  /** Successful store purchase. The money-spend cue still plays for the same spend. */
  storeBuy: ["sfx_store_buy"],
  /** Emergency ambulance siren for hospital admission. */
  ambulance: ["sfx_ambulance"],
};

/** Play the low-energy sting only when energy crosses down through this point. */
export const ENERGY_LOW_AT = 20;

const PHASE_CUE: Record<PhaseId, CueKey> = {
  morning: "phaseMorning",
  noon: "phaseNoon",
  evening: "phaseEvening",
  night: "phaseNight",
};

export function phaseCueKey(phase: PhaseId): CueKey {
  return PHASE_CUE[phase];
}

export type TimeAudioPlan = {
  phaseChimes: PhaseId[];
  /** One whoosh when a tick crosses more than one hour. Sleep does not use it. */
  timeSkip: boolean;
  dayStarted: boolean;
  sleep: boolean;
  bgmPhase: PhaseId | null;
  bgmPrevious: PhaseId | null;
};

/**
 * One clock tick can emit several boundaries. A single hour has no chime in
 * the pack. A multi-hour skip plays one time-skip sting. Sleep uses its own
 * cue and does not also play the day-summary or the whoosh.
 * The BGM follows only the destination phase.
 */
export function planTimeAudio(events: readonly TimeEvent[]): TimeAudioPlan {
  let bgmPhase: PhaseId | null = null;
  let bgmPrevious: PhaseId | null = null;
  let hours = 0;
  let dayStarted = false;
  let sleep = false;
  const phaseChimes: PhaseId[] = [];

  for (const event of events) {
    if (event.type === "phaseChanged") {
      phaseChimes.push(event.phase);
      bgmPhase = event.phase;
      bgmPrevious = event.previous;
    } else if (event.type === "hourChanged") {
      hours += 1;
    } else if (event.type === "dayStarted") {
      dayStarted = true;
    } else if (event.type === "sleep") {
      sleep = true;
    }
  }

  return {
    phaseChimes,
    timeSkip: !sleep && hours > 1,
    dayStarted: dayStarted && !sleep,
    sleep,
    bgmPhase,
    bgmPrevious,
  };
}

export function cueKeysForGameEvent(
  event: GameEvent,
  brackets: readonly RankBracket[],
): CueKey[] {
  switch (event.type) {
    case "skillXpGained":
      return event.amount > 0 ? ["xp"] : [];
    case "skillLevelUp": {
      const previous = rankBracketForLevel(event.level - 1, brackets);
      return previous.id !== event.rankId ? ["rankUp", "levelUp"] : ["levelUp"];
    }
    case "studyCompleted":
      return ["course"];
    case "jobAccepted":
      return ["jobAccepted"];
    case "jobCompleted":
      return ["jobCompleted"];
    case "milestoneReached":
      return ["milestone"];
    case "moneyChanged":
      if (event.delta > 0) return ["moneyIn"];
      if (event.delta < 0) return ["moneyOut"];
      return [];
    case "energyChanged": {
      if (event.delta > 0) return ["energyRestored"];
      const previous = event.energy - event.delta;
      if (event.delta < 0 && previous > ENERGY_LOW_AT && event.energy <= ENERGY_LOW_AT) {
        return ["energyLow"];
      }
      return [];
    }
    case "taskFailed":
      return ["jobFailed"];
    case "bugEscaped":
      return ["locked"];
    case "randomEventFired":
      return ["toast"];
    case "taskStarted":
    case "ticketChosen":
    case "buildChoice":
    case "bugCaught":
    case "taskSucceeded":
    case "taskRetried":
      return [];
    default:
      return [];
  }
}

/** Normal typing while the build bar runs. `./lam-au` switches to the fast loop. */
export function typingLoopKey(build: "careful" | "rushed" | null): CueKey {
  return build === "rushed" ? "typingLoopFast" : "typingLoop";
}

export function resolveCueKey(
  ids: Iterable<string>,
  key: CueKey,
): string | null {
  return resolveCueId(ids, CUE_IDS[key]);
}

export type PointerHit = {
  sfx: string | null;
  ariaDisabled: boolean;
  role: string | null;
  tag: string;
  disabled: boolean;
};

export function cueForHit(hit: PointerHit | null, kind: "down" | "over"): CueKey | null {
  if (!hit || hit.sfx === "none") return null;
  if (kind === "over") return "hover";
  if (hit.ariaDisabled || hit.disabled) return "locked";
  if (hit.role === "tab") return "tab";
  if (hit.tag === "button" || hit.role === "button") return "click";
  return null;
}
