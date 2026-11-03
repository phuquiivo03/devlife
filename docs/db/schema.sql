-- Knowledge + Job system v1.
-- Static rows ship as JSON in config/. Player rows persist in localStorage
-- with this same shape so a later Supabase adapter can replace storage only.
-- `players.energy` is temporary until the stats system owns vitals.

CREATE TABLE skills (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL
);

CREATE TABLE skill_level_xp (
  level integer PRIMARY KEY CHECK (level BETWEEN 1 AND 10),
  xp_to_next integer NOT NULL CHECK (xp_to_next >= 0)
);

CREATE TABLE study_activities (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  hours integer NOT NULL CHECK (hours > 0),
  energy integer NOT NULL CHECK (energy >= 0),
  skill_id text NOT NULL REFERENCES skills (id),
  -- false: the player can complete this course only once.
  repeatable boolean NOT NULL DEFAULT false
);

CREATE TABLE study_activity_xp (
  activity_id text NOT NULL REFERENCES study_activities (id),
  skill_id text NOT NULL REFERENCES skills (id),
  xp integer NOT NULL CHECK (xp >= 0),
  PRIMARY KEY (activity_id, skill_id)
);

CREATE TABLE job_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  job_type text NOT NULL CHECK (job_type IN ('freelance', 'remote')),
  tier integer NOT NULL CHECK (tier >= 1),
  hours integer NOT NULL CHECK (hours >= 0),
  deadline_days integer NOT NULL CHECK (deadline_days >= 0),
  pay integer NOT NULL CHECK (pay >= 0),
  salary integer CHECK (salary IS NULL OR salary >= 0),
  reputation_gain integer NOT NULL CHECK (reputation_gain >= 0),
  min_reputation integer NOT NULL CHECK (min_reputation >= 0),
  unlock_freelance_completed integer NOT NULL CHECK (unlock_freelance_completed >= 0),
  -- Per-task energy cost. The spec requires an energy check; the column is
  -- named here because the listed template fields did not include it.
  energy integer NOT NULL CHECK (energy >= 0)
);

CREATE TABLE job_template_requirements (
  template_id text NOT NULL REFERENCES job_templates (id),
  skill_id text NOT NULL REFERENCES skills (id),
  min_level integer NOT NULL CHECK (min_level BETWEEN 1 AND 10),
  PRIMARY KEY (template_id, skill_id)
);

CREATE TABLE job_template_xp (
  template_id text NOT NULL REFERENCES job_templates (id),
  skill_id text NOT NULL REFERENCES skills (id),
  xp integer NOT NULL CHECK (xp >= 0),
  PRIMARY KEY (template_id, skill_id)
);

CREATE TABLE career_milestones (
  id text PRIMARY KEY,
  freelance_completed integer NOT NULL CHECK (freelance_completed > 0),
  label text NOT NULL
);

-- One row per key. Rank brackets are the jsonb value of `rank_brackets`.
CREATE TABLE game_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

CREATE TABLE players (
  id text PRIMARY KEY,
  stage text NOT NULL,
  game_day integer NOT NULL CHECK (game_day >= 1),
  game_minute integer NOT NULL CHECK (game_minute BETWEEN 0 AND 1439),
  money integer NOT NULL,
  -- Floats. The HUD rounds. Sick players are capped at 70 energy.
  energy double precision NOT NULL CHECK (energy BETWEEN 0 AND 100),
  health double precision NOT NULL CHECK (health BETWEEN 0 AND 100),
  mood double precision NOT NULL CHECK (mood BETWEEN 0 AND 100),
  reputation integer NOT NULL CHECK (reputation >= 0),
  freelance_completed integer NOT NULL CHECK (freelance_completed >= 0),
  trait text NOT NULL CHECK (trait IN ('night_owl', 'diligent', 'extrovert', 'frugal', 'careful', 'optimist')),
  -- Entered in the creation popup after the trait roll. Empty falls back to the stub name.
  name text NOT NULL,
  trait_rolled boolean NOT NULL,
  intro_seen boolean NOT NULL
);

CREATE TABLE player_skills (
  player_id text NOT NULL REFERENCES players (id),
  skill_id text NOT NULL REFERENCES skills (id),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 10),
  xp integer NOT NULL CHECK (xp >= 0),
  PRIMARY KEY (player_id, skill_id)
);

-- Local saves omit player_id. No row means the course has not been completed.
CREATE TABLE player_study_completions (
  player_id text NOT NULL REFERENCES players (id),
  activity_id text NOT NULL REFERENCES study_activities (id),
  skill_id text NOT NULL REFERENCES skills (id),
  xp_gained integer NOT NULL CHECK (xp_gained >= 0),
  completed_day integer NOT NULL CHECK (completed_day >= 1),
  PRIMARY KEY (player_id, activity_id)
);

CREATE TABLE player_jobs (
  id text PRIMARY KEY,
  player_id text NOT NULL REFERENCES players (id),
  template_id text NOT NULL REFERENCES job_templates (id),
  job_type text NOT NULL CHECK (job_type IN ('freelance', 'remote')),
  status text NOT NULL CHECK (
    status IN ('offered', 'active', 'completed', 'failed', 'expired', 'quit', 'fired')
  ),
  hours_required integer NOT NULL CHECK (hours_required >= 0),
  progress_hours integer NOT NULL CHECK (progress_hours >= 0),
  bugs integer NOT NULL CHECK (bugs >= 0),
  pay integer NOT NULL CHECK (pay >= 0),
  offered_day integer NOT NULL CHECK (offered_day >= 1),
  accepted_day integer,
  deadline_day integer,
  finished_day integer,
  missed_days integer NOT NULL CHECK (missed_days >= 0),
  -- CRT task snapshot. Null while the job is only offered.
  task_run jsonb
);

CREATE TABLE player_unlocks (
  player_id text NOT NULL REFERENCES players (id),
  milestone_id text NOT NULL REFERENCES career_milestones (id),
  reached_day integer NOT NULL CHECK (reached_day >= 1),
  PRIMARY KEY (player_id, milestone_id)
);

-- One row per player. Counters for the life-sim day (M5 P1).
CREATE TABLE player_life (
  player_id text PRIMARY KEY REFERENCES players (id),
  meals_today integer NOT NULL CHECK (meals_today >= 0),
  positive_mood_applies integer NOT NULL CHECK (positive_mood_applies >= 0),
  work_streak integer NOT NULL CHECK (work_streak >= 0),
  worked_today boolean NOT NULL,
  fun_slots_today integer NOT NULL CHECK (fun_slots_today >= 0),
  late_slots_today integer NOT NULL CHECK (late_slots_today >= 0),
  mood_penalty_tomorrow double precision NOT NULL CHECK (mood_penalty_tomorrow >= 0),
  rent_debt_days integer NOT NULL CHECK (rent_debt_days >= 0),
  rent_issued_key text,
  paid_rent_key text,
  paid_utilities_key text,
  paid_salary_key text,
  burnout_day integer,
  last_ended_day integer,
  settled_day integer,
  morning_resolved_day integer,
  wake_budget integer NOT NULL CHECK (wake_budget > 0),
  suppress_end_of_day_until integer,
  -- Persist v15. Older saves start at 0.
  slots_since_meal integer NOT NULL CHECK (slots_since_meal >= 0),
  -- Persist v17. Older saves start at 0.
  job_notice_slots integer NOT NULL CHECK (job_notice_slots >= 0)
);

-- Roll state, diary, and the open dialog (M5 P2). Notices are player_notices.
CREATE TABLE player_life_feed (
  player_id text PRIMARY KEY REFERENCES players (id),
  pity integer NOT NULL CHECK (pity >= 0 AND pity <= 3),
  pity_counted_day integer,
  small_event_day integer,
  cooldowns jsonb NOT NULL,
  flags jsonb NOT NULL,
  pending_event_id text,
  queued_story_id text,
  deferred_roll boolean NOT NULL,
  next_bug_delta integer NOT NULL,
  hackathon_start_day integer,
  hackathon_resolved boolean NOT NULL,
  snapshot_day integer NOT NULL,
  snapshot_money integer NOT NULL,
  snapshot_xp integer NOT NULL,
  snapshot_health double precision NOT NULL,
  snapshot_mood double precision NOT NULL,
  snapshot_energy double precision NOT NULL,
  diary jsonb, -- v16 adds slept_day and slept_at inside this document; older diaries leave them null
  -- Persist v14. Empty for an older save. Spent fields are positive amounts.
  purse jsonb NOT NULL,
  banner_day integer,
  landlord_told integer NOT NULL CHECK (landlord_told >= 0),
  sick_open boolean NOT NULL,
  burnout_open boolean NOT NULL,
  store_asked boolean NOT NULL
);

-- Bought rooms and furniture, plus the one pinned item (M5 P3).
CREATE TABLE player_shop (
  player_id text PRIMARY KEY REFERENCES players (id),
  owned jsonb NOT NULL,
  pinned_item text
);

CREATE TABLE player_notices (
  id text NOT NULL,
  player_id text NOT NULL REFERENCES player_life_feed (player_id),
  at_day integer NOT NULL CHECK (at_day >= 1),
  at_minute integer NOT NULL CHECK (at_minute >= 0 AND at_minute < 1440),
  severity text NOT NULL CHECK (severity IN ('info', 'warn', 'urgent')),
  icon text NOT NULL,
  body text NOT NULL,
  action text CHECK (
    action IN ('payRent', 'viewJobs', 'openStore', 'eat', 'sleep', 'acceptJob', 'dismissNotice', 'openJobs')
  ),
  -- Persist v17. Buttons `{ id, label, icon?, variant? }`. Older rows copy `action` into one button.
  actions jsonb NOT NULL,
  -- Persist v17. `{ jobId }` when the row is about one job. Null otherwise.
  payload jsonb,
  read boolean NOT NULL,
  -- Persist v9. Null keeps the id and severity sound rules.
  cue text CHECK (cue IS NULL OR cue IN ('eventOpen', 'landlordKnock', 'salary', 'sickCough', 'storeBuy', 'diaryFlip')),
  PRIMARY KEY (player_id, id)
);

CREATE TABLE player_events (
  id text PRIMARY KEY,
  player_id text NOT NULL REFERENCES players (id),
  type text NOT NULL,
  day integer NOT NULL CHECK (day >= 1),
  payload jsonb NOT NULL
);
