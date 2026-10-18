export const WORLD = { w: 427, h: 240 } as const;
export const UNITS = "px@427x240";

export const MIN_VIEW_W = 200;
export const PORTRAIT_SCENE_MAX_H = 0.62;

export const DEFAULT_LETTERBOX = "#15111c";

export const CHAR_DOWNSCALE = 3.5;
export const CHAR_KEY = { r: 209, g: 17, b: 90 };
export const SIT_HIP_FROM_BOTTOM = 9;
export const FLOOR_SIT_OFFSET_Y = -4;

export const STAGES = ["student", "junior", "senior"] as const;
export type StageId = (typeof STAGES)[number];

export const PERSIST_KEY = "devlife:v1";
/**
 * v1: stage, loadouts, showCharacter.
 * v2: in-game `totalMinutes` (see docs/systems/time.md).
 * v3: career tables for knowledge + jobs (see docs/systems/knowledge.md).
 * v4: player_study_completions. Older saves have no course history, so none are completed.
 * v5: player_jobs.task_run. Older jobs have no in-progress CRT task.
 * v6: health, mood, and the life-sim day counters. Older saves gain the defaults.
 * v7: life feed (events, notices, diary). Older saves gain an empty feed.
 * v8: store ownership and the pinned item. Older saves own nothing and stay in the student room.
 * v9: notice `cue`. Older notices leave it null and keep the id and severity rules.
 * v10 was a short-lived room grant that was reverted. Do not reuse it.
 * v11: `players.trait` and `life.homeDays`. That version wrote Cẩn thận. Home days start at 0.
 * v12: `players.traitRolled`. A save that has not been rolled gets one random trait, including a v11 Cẩn thận. A real non-careful v11 trait, or a save already marked rolled, is kept. Home days from v11 stay.
 * v13: `players.introSeen`. Older saves have already started, so the creation popup stays closed.
 * v14: `feed.purse`. Older saves start the day with an empty purse. Money, skills, and progress stay.
 * v15: `life.slotsSinceMeal`. Older saves start at 0, as if they just ate. Money, skills, and progress stay.
 * v16: `feed.diary.sleptDay` and `feed.diary.sleptAt`. An older diary omits the sleep clock. Money, skills, and progress stay.
 * v17: notice `actions` (`{ id, label, icon?, variant? }[]`) and `payload.jobId`, plus `life.jobNoticeSlots`. A legacy `action` string becomes one button. An older string list or `jobId` field is folded in. The slot counter starts at 0. Money, skills, and progress stay.
 * v18: offered and in-progress jobs become accepted. The deadline is recomputed from the save's current day (easy 2, mid 3, hard 4). Pay, progress, and the task run stay.
 */
export const PERSIST_VERSION = 18;

export const CHAR_POSE_SIT_BACK = "character/derived/char_sit_back";
export const ATLAS_URL = "/atlas/devlife.png";
export const ATLAS_JSON_URL = "/atlas/devlife.json";
