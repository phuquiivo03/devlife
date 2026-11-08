# Task run

Freelance **Nhận** opens a CRT terminal over the center column (`TaskRunOverlay`, tokens in `docs/design/TERMINAL.md`). Esc closes it and leaves the job `active`, so the board can say Tiếp tục. Timers pause while the overlay is closed (`taskLive` false) until the player hits **Tiếp tục**. Energy is spent only on **Bắt đầu** (`beginTaskRun`), not on open. Money and freelance credit apply only on **Xong** (`commitTask` from step `ready`). The room canvas size does not change.

Each run is about 30 seconds for the manual path. Agent paths scale with `time_multiplier`. Copy is Vietnamese. Technical words stay in English and have a tap/hover tooltip from `glossary`.

Licensed coding agents live in the store tab **AI Agent** (`config/agents.json`). After `freelance_completed >= 1`, the shop sells Cờlốt, Củsỏ, and Câupilot. Agents can code (careful path, seeded event + bug filter) and optionally fix bugs on step `bug_choice`.

## Steps

0. **Select.** Tự làm or a owned agent. Accepting a job without continuing lands here (not an empty overlay).
1. **Ticket** (~5s). The client note shows pay, the 30s hạn chót, the skill, and difficulty. Three readings: one correct, one wrong (more bugs), one “hỏi lại khách” (no extra bugs, extra build time).
2. **Build** (~15s). An ASCII bar and a log run on their own. Around 40% the bar waits for `./lam-ky` (more time, fewer bugs) or `./lam-au` (less time, more bugs). A seeded random event may fire: khách đổi yêu cầu, mất mạng, or works on my machine. Every one of those events prints a line, not only a debug event. A requirement change (`warning`) prints `> WARNING:` in amber, blinks `terminal_warn_blinks` times, and shakes lightly. `bug_delta` above 0 prints `> ERROR:` in `terminal-bug-red` and blinks `terminal_error_blinks` times. The flavor log stays sage. `prefers-reduced-motion` leaves the lines still. No extra sound: `randomEventFired` still plays `sfx_ui_toast` once. While the bar is up, `sfx_typing_loop` loops from its own file. `./lam-au` switches to `sfx_typing_loop_fast`. The loop stops when the bar finishes, the terminal closes (Esc, which leaves the job active), the task moves on, or the tab is hidden.
3. **Test** (~10s). Pixel bugs crawl on a code snippet. Tap to catch them. Any bug still loose when the timer ends is a fail. Bugs are red (`terminal-bug-red` in `docs/design/TERMINAL.md`). The same red paints a task event's `> ERROR:` line. Failure labels stay green. They come in three sizes from `bug_motion`: small is fastest and turns most often, large is slowest. Speed, glyph size, turn interval, and spawn weights live in `config/task_run.json`. The tap target stays at least 44px on every size. `prefers-reduced-motion` slows them and lengthens turns; they still move.
4. **Bug choice** (when agents exist and bugs remain after build). Pick manual test or an agent fix timer. Bug ids are stable across retry; fixed bugs stay fixed.
5. **Agent fix** (optional). Deterministic partial work checkpoints into `fixed_bug_ids`.
6. **Ready.** Work is done but unpaid. **Xong** runs `commitTask` once (revision guard). Company tasks still grant rep/XP here with 0đ.
7. **Result.** Terminal summary after commit or final fail. The first fail offers `./retry` (`retryEnergyCost`, not a flat constant). Retry does not reroll `bug_ids`. Failure is a `[fail]` label and a minus number. It does not use red.

**Cross-tab:** No global single-writer lock in this PR. Two browser tabs can still race on the same save. In-tab `revision` checks and idempotent buy/start guards reduce duplicate charges within one tab only.

## Bug count

`bugCount` in `src/game/task-run/formula.ts`, tuned by `config/task_run.json` `bugs`:

`clamp(base + (difficulty - 1) * per_difficulty - floor((level - 1) / skill_step) + ticket + build + event, min, max)`

Wrong ticket and `./lam-au` add bugs. Asking the client does not. A higher skill level removes bugs.

## Events

Emitted on `gameBus` and stored in `player_events`:

`taskStarted`, `ticketChosen`, `buildChoice`, `randomEventFired`, `bugCaught`, `bugEscaped`, `taskSucceeded`, `taskFailed`, `taskRetried`.

Success also emits the existing `jobCompleted`, `moneyChanged`, and `skillXpGained` events so the current audio map plays `sfx_money_gain` and `sfx_job_complete`. `taskFailed` plays `sfx_job_failed`. `bugEscaped` plays `sfx_ui_locked_denied`. `randomEventFired` plays `sfx_ui_toast`. The typing loops are file cues (`loop: true`, volume 0.38) and stay out of the SFX sprite. Ogg loops the whole buffer. The mp3 fallback skips the leading encoder silence with `loopStart` / `loopEnd`.

## Save

`player_jobs.task_run` holds the step, seed, choices, bug ids, agent fields, retries, and outcome. Persist version **27** adds `career.agents`, task steps `select|bug_choice|agent_fix|ready`, and migration for in-flight runs. Older saves load with `task_run` null or normalized defaults.
