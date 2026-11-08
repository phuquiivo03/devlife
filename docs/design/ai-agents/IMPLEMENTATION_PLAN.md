# AI Agent trio — implementation plan

Stage 2 work order for the coding agent. Design sources: [SPEC.md](SPEC.md) (flow, state, acceptance), [BALANCE.md](BALANCE.md) (numbers), [CREDITS.md](CREDITS.md) (assets). Where this plan and the spec differ, this plan says why in **Decisions** below; everything else in the spec stands.

Verified against `main` at `b697ba3` (same snapshot as the spec). Re-run the checks in Phase 0 before coding; if `main` moved, rebase and re-verify.

## Hard rules

- Never edit `src/components/game/CustomizePanel.tsx`. Check with `git diff --name-only origin/main | grep -c CustomizePanel` → `0` before every push.
- Never commit `graphify-out/`, `*.tsbuildinfo`, or secrets (both paths are already in `.gitignore`; still check `git status`).
- No LLM, API key, token, subscription or network call. Agents are pure simulation.
- No auto-accept and no auto-submit. Only the player's **Xong** pays a task, on every path, manual included.
- Manual play must stay complete without owning any agent. Day 1 forced flow (study → bell → jobs) stays as is.
- Company tasks keep 0 freelance pay and do not increase `freelance_completed`. They still give XP and reputation.
- Work on a feature branch. Do not merge or push to `main`.
- Follow `AGENTS.md`: turn this plan into a done-criteria todo list first. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` before each push (CLAUDE.md asks for the build check).

## Current code facts that shape the plan

| Area | Fact (file) | Consequence |
| --- | --- | --- |
| Save | `PERSIST_VERSION = 26` (`src/game/config.ts:18`); `migrateSave` in `src/game/storage/migrate.ts`; `normalizeTaskRun` drops unknown steps and returns `null` | Bump to 27. Old steps must still normalize. New steps must be added to `TASK_STEPS` or they are wiped. |
| Run shape | `TaskRun` = step/seed/ticket/build/event_id/bugs_total/bugs_caught/retries/outcome/time_bonus_sec (`src/game/career/types.ts:359`) | Extend it with optional-on-read fields. Keep the old fields so old code paths and tests read the same. |
| Start | `startTask` activates the job, spends template energy, and creates a run at `ticket` (`task-run/apply.ts:122`). Called by `acceptJob` (store), Làm (`JobManageBoard`), Cố làm (`JobBoardPanel`), the notice `openJobs` action. | Energy moves to a new "begin" step after the picker. |
| Board | Board **Nhận** sets `status: "active"` with `task_run: null` straight through `useGameStore.setState` (`JobBoardPanel.tsx:117`). Board **Tiếp tục** calls `openTask`, and the overlay returns `null` when `task_run` is null. | Existing bug: Tiếp tục on a run-less job shows nothing. Opening a task must create the select-step run. |
| Success | `catchBug` → `grantTaskSuccess` as soon as the last bug is caught; `finishTest` does the same if cleared (`apply.ts:243-269`). `grantTaskSuccess` has no status guard. | This is where READY + Xong goes. Add a `status === "active"` guard. |
| Progress | Build bar and test timer are React state only (`TaskRunOverlay.tsx` `BuildStep`, `TestStep`). Reopening restarts the bar; a reopened test respawns all bugs while `bugs_caught` stays, so the counter is wrong. | Persist a checkpoint. Bugs get stable IDs. |
| Retry | `applyRetry` sets `bugs_caught: 0` (all bugs back). UI checks `energy >= TASK_RUN.retry_energy` but `retryTask` charges `energyCost(retry_energy × jobEnergyFactor, workStreak)`. | Retry keeps fixed bugs (spec). One shared `retryEnergyCost(state)` for UI and logic. |
| Bugs | `bugCount` clamps to `bugs.min..max` = 1..4, then `traitBugCount` clamps again. `takePendingBugDelta` consumes `feed.nextBugDelta` at build choice. Event is `rollTaskEvent(run.seed, …)` at ticket choice, so it is fixed per job. | B is this number. Agent N is not re-clamped to 1. The pending delta is consumed exactly once on both paths. |
| Time | `jobTimeScale(state)` (Cẩn thận trait) scales `build_sec` and `test_sec`; ask/event deltas are added unscaled. Game clock keeps running while the overlay is open (`useGameClock` `isPaused` ignores the task). | `T_build_base` reuses the exact current formula. Deadlines keep running during READY. |
| Deadlines | `applyJobDeadlines` fails any `active` job past `deadline_day` (`jobs/deadlines.ts`). | READY is still `status: "active"`, so it fails on time with no new code. Xong must check `status === "active"`. |
| Shop | `ShopState.owned` is filtered to furniture catalog IDs by `normalizeShop`; owned items feed room placement (`owned-items.ts`); `storePrice` applies the Black Friday discount; `buyShopItem` grants purchase mood. | Agent licenses get their own slice, their own price (no sale), and no mood bonus. |
| Opening | `openingDone` turns true when the guided job is opened (`store.ts` `openTask`/`acceptJob`). `openingLocksInput` blocks the store during the flow. | Unchanged. The AI gate is `freelance_completed >= 1`, separate from `openingDone`. |
| Hospital | `maybeHospital` sets `faint` but does not close the task overlay. | A faint or hospital stay must pause the run. |
| Docs drift | `docs/systems/task-run.md` says persist version 5; spec §2 already flagged it. | Update the docs in the same PR. |

## Decisions (contradictions resolved)

These resolve gaps between the spec and the code, within the spec's intent. Items marked **FLAG** change existing manual behavior or scope and need a PM look; the rest are implementation detail.

1. **Energy moves from open to begin.** Opening a task (Làm / Tiếp tục / notice) activates the job and creates a run at the new `select` step without spending. Eligibility (skill, burnout, energy) is still checked on open, so a blocked job shows the same error as today, and it is checked again at begin. `Bắt đầu` spends the current `template.energy × jobEnergyFactor` once and sets `start_paid`. Cố làm carries `force` into the run so begin applies the existing `force_health` cost. An agent never forces on its own; the player chose Cố làm.
2. **FLAG — manual retry keeps fixed bugs.** Today a retry respawns every bug. The spec keeps fixed bug IDs and partial work, refills the manual timer, and does not re-roll anything. This applies to manual-only runs too (one model, no second code path). It makes the second attempt a little easier. Retry still needs a confirm and the energy cost, and still uses the one `max_retries`.
3. **Checkpoints for every run, manual included.** Build progress (a 0..1 work fraction), the manual timer left, fixed bug IDs and partial fix work are persisted. That also fixes the reopen bugs in the table above. The component commits a checkpoint about every 1s, on step change, on `visibilitychange` hidden, and on unmount. It does not write every 100ms: Zustand persist writes the whole save on each `set`.
4. **Resume is always explicit.** After closing the overlay, reloading, or a faint, a running phase (build, manual test, agent fix) opens behind a `Tiếp tục` gate. It never auto-runs and nothing advances offline. The first entry into a phase right after a player action runs at once, so manual play feels the same as today. A non-persisted store flag `taskLive` tells the two cases apart.
5. **One execution at a time with no new lock.** Only one overlay can be open (`taskJobId`), and runs only advance inside it. "Busy" means: this job is open, `taskLive` is true, and its step is agent build or agent fix. If `openTask` is called for a different job while one is open, show the spec's "Đang làm [tên]. Tiếp tục / Tạm dừng và mở task này" confirm; confirming checkpoints and closes the first.
6. **N may be 0, manual is unchanged.** Manual uses B as today (min 1). An agent coder filters each of the B potential bugs with `q`; N is 0..B and is never clamped up. N = 0 skips the bug gate and goes to READY.
7. **When the agent rolls.** The agent run locks the coder at `Bắt đầu`, then rolls the event (same seed function as manual), consumes the pending bug delta, computes B with ticket `correct` + build `careful`, and filters it, all in that one transition. The surviving IDs are stored but only shown when the build finishes. Same seed + coder + catalog version gives the same result after reload or retry. Fixer, retry count, clock and `Math.random` are never inputs.
8. **Reward computed at Xong, not snapshotted.** `grantTaskSuccess` already recomputes pay from the template and current reputation. READY shows the same pure preview function live, with "Chưa giao cho khách, chưa nhận thưởng". There is one formula, so there is no snapshot to drift. The guard against double pay is `status === "active" && step === "ready"`. The commit flips status to `completed` in the same transition, which is the spec's `completionCommitted`.
9. **Agent build takeover.** On resume of an agent build the gate offers `Tiếp tục với [agent]` and `Tự làm tiếp`. Taking over only changes the speed multiplier for the remaining work to 1.00. The coder snapshot and the already-rolled bug set stay, so it is not a reroll. A manual build cannot be handed to an agent coder (fixing can).
10. **Agent intro is 5s, not scaled.** The read/decide intro is `ticket_sec` (5s) and uses neither `m` nor `timeScale`, as the spec states. Build uses `T_build_base × m_coder`. Agent fix uses `workRemaining × test_sec × timeScale × m_fixer`.
11. **Price is fixed.** Agents are not `StoreItem`s, do not go through `storePrice`, so no Black Friday discount and no purchase mood. Spend goes through `applyActionStats({ money: -price })` and `notePurse(-price, "shop")` so the sleep diary still counts it.
12. **Portraits and the CRT.** Portraits show at 64px (256 source for hi-DPI) on shop cards and at 48px on picker cards, which were designed for 48px. Inside the CRT log the agent is text only (`[AI] Cờlốt · Đang code`), so the terminal palette in `docs/design/TERMINAL.md` is unchanged.
13. **Gate and unlock notice.** The tab is always visible. Before `freelance_completed >= 1` the cards show the reason "Hoàn thành 1 việc freelance để mở" and cannot be bought, and the picker's agent cards are disabled with the same reason. The first freelance Xong that crosses the gate pushes one info notice, "Đã mở AI Agent trong Cửa hàng", with the existing `openStore` action. No modal, no blinking. Migrated saves already past the gate get no notice. Company completions do not unlock it (spec wording).
14. **FLAG — two-tab single writer is a separate phase.** The game has no cross-tab protection for any action today. Two tabs overwrite each other's save, so the risk is lost updates, not doubled pay. The spec's lease and read-only second tab touch every write in the game, not just agents. It is Phase 9: optional, its own commit, and it can ship in a follow-up PR without blocking the feature.
15. **Board Nhận stays as is.** The board's accept-without-start path is unchanged. Only the open path is fixed, by decision 1, so a run-less active job now opens to the picker. Moving that inline `setState` into a store action is out of scope.

## Data model

### Catalog — `config/agents.json` (new)

```json
{
  "version": 1,
  "gate_freelance_completed": 1,
  "intro_sec": 5,
  "agents": [
    { "id": "claude_inspired",  "name": "Cờlốt",   "chip": "Nhẹ bug",  "price": 900000,  "time_multiplier": 0.90, "bug_survival": 0.25, "capabilities": ["code", "fix_bug"] },
    { "id": "cursor_inspired",  "name": "Củsỏ",  "chip": "Chạy lẹ",  "price": 1200000, "time_multiplier": 0.55, "bug_survival": 0.80, "capabilities": ["code", "fix_bug"] },
    { "id": "copilot_inspired", "name": "Câupilot", "chip": "Dễ mua",   "price": 180000,  "time_multiplier": 1.10, "bug_survival": 0.60, "capabilities": ["code", "fix_bug"] }
  ]
}
```

Icons resolve by ID: `/icons/agents/agent_<id>_{64,256,512}.png` (see `public/icons/agents/manifest.json`). Add a zod schema next to the other content schemas, and a unit test that the catalog has exactly these three IDs and that every icon file exists.

### `src/game/agents/` (new)

- `types.ts`: `AgentId`, `AgentDef`, `AgentsState = { owned: AgentId[] }`, `AgentSnapshot = { id, time_multiplier, bug_survival, catalog_version }`.
- `content.ts`: `AGENTS`, `agentById`, `isAgentId`, `agentIconPath(id, size)`.
- `logic.ts` (pure):
  - `agentsOf(state)`, `ownsAgent(state, id)`, `agentShopUnlocked(state)` (`freelance_completed >= gate`).
  - `agentBuyBlock(state, id): string | null` returns, in order, "Không có agent này." / "Hoàn thành 1 việc freelance để mở." / "Đã có." / "Không đủ tiền.".
  - `buyAgent(state, id): ActionResult` re-checks the block, spends, and appends the ID once. A repeat call returns the "Đã có." error and changes nothing.
  - `qualityRoll(seed, coderId, index): number` = FNV-1a over `` `${seed}:coding-quality:${coderId}:${index}` `` into one `mulberry32` draw. Export `mulberry32` from `task-run/formula.ts` rather than copying it.
  - `survivingBugIds(seed, snapshot, B): string[]` returns `b${i}` for each `i < B` with `qualityRoll(...) < q`.
  - `agentPreview(state, job, agentId)`: code seconds, fix-all seconds, `[min,max]` of `P_any = 1 − (1−q)^B` and of `E[N] = Bq` over the event candidates {no event, each configured event}, plus effective energy. It peeks at `feed.nextBugDelta` without taking it. It shows a single number when min equals max, and it never calls `rollTaskEvent`.

### `CareerState.agents` (new top-level slice)

`agents: { owned: AgentId[] }` is kept apart from `shop` so `normalizeShop`, owned-room placement and `owned-items.ts` never see it. `defaultCareer` starts it empty.

### `TaskRun` extension

```ts
export type TaskStep =
  | "select"      // new: Tự làm / Dùng Coding Agent picker; nothing paid yet
  | "ticket" | "build"
  | "bug_choice"  // new: "Có N bug. Ai sửa?"
  | "test"        // manual fix minigame
  | "agent_fix"   // new
  | "ready"       // new: clean, waiting for Xong; no reward yet
  | "result";

type TaskRun = {
  // existing fields unchanged …
  revision: number;              // +1 on every transition; timers pass it back, stale = no-op
  start_paid: boolean;
  force: boolean;                // opened via Cố làm
  mode: "manual" | "agent" | null;        // null while step === "select"
  coder: AgentSnapshot | null;   // locked at begin
  build_runner: "manual" | "agent";       // takeover switches to manual
  build_progress: number;        // 0..1 work fraction checkpoint
  potential_bugs: number;        // B
  bug_ids: string[];             // the N surviving IDs, stable
  fixed_bug_ids: string[];
  fix_partial: { bug_id: string; left: number } | null; // left in 0..1 of one bug
  fixer_id: AgentId | null;      // agent currently fixing, null for manual
  manual_left_sec: number | null;          // null = full budget at next manual start
};
```

`bugs_total` and `bugs_caught` stay as derived mirrors (`bug_ids.length`, `fixed_bug_ids.length`) so the job board, result screen and existing tests keep working.

## State machine (pure, `src/game/task-run/`)

Each transition validates `job.status === "active"` and the expected step, bumps `revision`, and returns `ActionResult`. A wrong step or revision returns an unchanged state with no events (a no-op, not an error toast).

| Function | From → to | Notes |
| --- | --- | --- |
| `openTaskRun(state, jobId, catalog, force)` | offered/active without run → `select` | Replaces the energy part of `startTask`. Activates the job, sets pay/hours as now, `start_paid: false`. An existing run is returned untouched. |
| `beginTaskRun(state, jobId, { mode, coderId? }, catalog)` | `select` → `ticket` (manual) or `build` (agent) | Re-checks eligibility, spends energy once, emits `taskStarted`. Agent path: must own the agent and pass the gate; snapshots the coder; rolls the event, takes the pending bug delta, computes B with correct/careful, sets `bug_ids` from `survivingBugIds`; emits `ticketChosen`, `randomEventFired`, `buildChoice` with `agentId`. |
| `chooseTicket` / `chooseBuild` | unchanged for manual | `chooseBuild` sets `bug_ids = b0..b(B−1)`. |
| `checkpointBuild(state, jobId, rev, progress)` | `build` | Only moves progress forward and clamps it to 0..1. |
| `takeOverBuild(state, jobId, rev)` | agent `build` | `build_runner: "manual"`. |
| `finishBuild(state, jobId, rev)` | `build` → `ready` (N=0) / `bug_choice` (agent, N>0, or manual with agents owned) / `test` (manual, owns none) | A manual player with no agent sees today's flow: build → test. |
| `chooseFixer(state, jobId, rev, "manual" \| AgentId)` | `bug_choice` → `test` / `agent_fix` | Fixer must be owned and the gate must be open. |
| `catchBug(state, jobId, bugId)` | `test` | Idempotent per ID. Clears any partial work on that bug. The last bug → `ready` (no grant). |
| `checkpointManual(state, jobId, rev, leftSec)` | `test` | Only moves down. |
| `finishTest` (timer 0) | `test` → `result`/fail or final fail | Same rules as today. Escaped = unfixed IDs. |
| `checkpointAgentFix(state, jobId, rev, workDoneDelta)` | `agent_fix` | Consumes work in bug ID order, one bug weight = 1/N, rate `1 / (test_sec × timeScale × m_fixer)` of total work per second. Writes `fixed_bug_ids` and `fix_partial`. All clean → `ready`. |
| `switchFixer(state, jobId, rev, target)` | `test`/`agent_fix` → `bug_choice` | Keeps IDs, partial work and `manual_left_sec`. Grants nothing back. |
| `retryTask` | `result`/fail → `bug_choice` (owns ≥1 agent) or `test` | Confirm happens in the UI. Charges `retryEnergyCost(state)`, `retries + 1`, `manual_left_sec = null` (full budget), keeps fixed IDs and partial work. No re-roll. |
| `commitTask(state, jobId, rev)` | `ready` → `result`/success | The only path that calls `grantTaskSuccess`. The first freelance commit crossing the gate also pushes the unlock notice. |
| `grantTaskSuccess` | — | Gains a `status === "active"` guard. `applyAccept` (test helper) keeps working by calling it directly. |

Timing helpers live in `task-run/timing.ts`, one place shared by the UI, the preview and tests:

- `buildBaseSec(run, timeScale)`: pre-choice `max(1, build_sec×ts + ask + event_delta)`, plus post-choice `max(1.2, pre×(1−choice_at) + careful/rushed)`. These are today's numbers, moved out of `BuildStep`.
- `buildSec(run, ts) = buildBaseSec × (build_runner === "agent" ? coder.m : 1)` for the remaining work.
- `agentFixTotalSec(ts, m) = test_sec × ts × m` for N bugs, not multiplied by N.
- `manualBudgetSec(ts) = test_sec × ts`.
- `retryEnergyCost(state)`.

Sanity checks that must hold in a test with timeScale 1, no event, B = 1, correct + careful: build = 19s; agent code 17.1 / 10.45 / 20.9s; agent fix 9 / 5.5 / 11s; expected total with the same coder and fixer 24.35 / 19.85 / 32.5s (BALANCE.md table).

## Save migration v26 → v27

- `PERSIST_VERSION = 27`. If `main` has moved past 26 before coding, use latest + 1 and put the branch after that version's branch.
- `careerFromUnknown`: `agents: normalizeAgents(raw.agents)` keeps only known IDs, de-duplicated. A missing slice becomes `{ owned: [] }`. No license is granted for free.
- `normalizeTaskRun` accepts the new steps and fills every new field with a safe default. Add `version` as a parameter, or run a `version < 27` pass after normalize, so that old runs map as follows:
  - `result`/`success` (already paid, job `completed`) stays exactly as is. **Never** map it to `ready`. Add a test that loads a v26 completed save, then calls `commitTask` and `grantTaskSuccess` and checks money, XP, reputation, `freelance_completed` and milestones do not change.
  - `result`/`fail` (first fail, job active) stays as is, `retries` kept. The retry goes to `test`, or to `bug_choice` once agents are owned.
  - `test`: `bug_ids = b0..b(bugs_total−1)`, `fixed_bug_ids` = the first `bugs_caught` of them, `manual_left_sec = null`. It opens behind the resume gate.
  - `build` with a build choice: `build_progress = choice_at`. Without a choice: 0.
  - `ticket`: as today.
  - Every old run: `mode: "manual"`, `coder: null`, `build_runner: "manual"`, `start_paid: true` (the v26 `startTask` already charged it), `force: false`, `revision: 0`.
  - An active job with `task_run: null` stays null and gets the `select` run on open, unpaid.
  - A defensive edge: `result`/`success` on a job that is not completed stays unchanged and can never reach `ready`, so it can never pay.
- Opening flags, money, XP, shop, loadouts are untouched.
- Update the `migrateSave` doc comment, `docs/systems/save.md` (v27 note), `docs/db/schema.sql` (a `player_agents` table with `owned jsonb`, plus a comment listing the new `task_run` keys), and `docs/systems/task-run.md` (new steps and the stale "version 5" line).

## Store wiring (`src/game/state/store.ts`)

- New non-persisted fields: `taskLive: boolean` and `taskSwitchConfirm: string | null`.
- `acceptJob(jobId, force)` and `openTask(jobId)` both go through `openTaskRun` and then set `taskJobId`. The opening `guidedJob` branch is unchanged, so `openingDone` still flips at open.
- New actions: `beginTask`, `checkpointTask(kind, rev, value)`, `takeOverBuild`, `finishTaskBuild`, `chooseTaskFixer`, `switchTaskFixer`, `commitTaskRun`, `resumeTask` (sets `taskLive`), `buyAgent`, `confirmTaskSwitch`, `cancelTaskSwitch`. Each one reads `get().career` fresh and ignores errors from stale revisions.
- `closeTask` sets `taskLive: false`. The overlay's unmount effect has already committed the last checkpoint.
- When a faint starts (`maybeHospital`, faint paths), call `closeTask()` if a task is open. When the hospital popup opens, do the same.
- `onRehydrateStorage`: `taskLive` stays false.
- Audio: `taskSucceeded` and `jobCompleted` cues now fire at Xong, because they come out of `grantTaskSuccess`. The agent build reuses `typingLoopKey("careful")`. No new sound files.

## UI

### Shop (`StorePanel.tsx`, `store-shelf.ts`)

- `STORE_TABS` becomes Nội thất / Phòng / **AI Agent** (`id: "agents"`) / Tất cả. Tất cả shows furniture, then rooms, then an "AI Agent" group heading. `filterStoreItems` stays furniture/room only. The agent grid is its own component, `src/components/game/agents/AgentShopGrid.tsx`.
- Card: 64px portrait (`agent_<id>_256.png` at 64×64, `objectFit: contain`, no `pixel-img`), name + "Coding Agent", chip, price "Cân bằng thử nghiệm", then three rows in fixed order:
  - Thời gian code/fix ×0,90 (with "nhanh hơn 10%" style help text)
  - Bug 25% mỗi bug tiềm năng còn lại, with a tooltip giving the §4.2 definition
  - Giá 900.000đ
  - Status: Chưa sở hữu / Sẵn sàng / Đang giúp task [tên].
- Mua opens a confirm (the existing `Modal`/`Dialog`): "Mua [tên] với [giá]?", balance before/after, "Mua đứt · không tự giao task", Hủy / Xác nhận mua. The button disables while the action runs. A blocked card shows its reason, like `buyBlock` does today.
- Đã sở hữu mode: a "License AI" group under the furniture grid. Cards have no placement action.
- At 320px wide, four tabs in the `h-11` grid must not overflow. Allow two lines or a smaller label; check in Playwright at 320×640.

### Task overlay (`TaskRunOverlay.tsx`, split into files)

The file is already 532 lines. Move each step into `src/components/terminal/task-run/` (`SelectStep`, `TicketStep`, `BuildStep`, `BugChoiceStep`, `TestStep`, `AgentFixStep`, `ReadyStep`, `ResultStep`, `ResumeGate`, `AgentPickCard`). Keep the existing `data-testid`s.

- **SelectStep**: ticket summary (pay, skill, difficulty, energy) and `[1] Tự làm` / `[2] Dùng Coding Agent`. The agent list shows all three cards (48px portrait, same three rows as the shop), plus the `agentPreview` for this job and a "dự kiến trước event" badge. Unowned or gated cards are disabled with a reason and a "Xem cửa hàng AI" button. That button closes the task (the run stays `select`, unpaid) and opens the store on the AI tab. Selecting nothing auto-picks nothing. `Bắt đầu với [tên]` / `Bắt đầu tự làm` calls `beginTask`.
- **Agent build**: `[AI] Cờlốt · Đang đọc` during the 5s intro, then `Đang code`; the existing bar and logs; progress from `build_progress`; no careful/rushed popup.
- **BugChoiceStep**: "Có N bug. Ai sửa?" with `Tự sửa` (timer left) and the owned fixer cards (time left for remaining work, the note "Chỉ áp dụng khi agent code; đổi fixer không thay bug đã có"). The coder is pre-highlighted but never auto-started.
- **TestStep**: spawns only unfixed IDs (`spawnBugs` keyed by ID index, not `seed + retries`). The timer starts from `manual_left_sec`. A "Đổi người sửa" button opens `switchTaskFixer`.
- **AgentFixStep**: bar over the remaining work, live list of fixed IDs, "Đổi người sửa".
- **ReadyStep**: coder, fixer, the expected pay/XP/reputation (pay 0đ for company), "Chưa giao cho khách, chưa nhận thưởng", and `Xong` / `Để sau`. `Để sau` and Esc close and keep READY.
- **ResultStep**: success is reached only after Xong ("[ok] Đã giao cho khách" + đóng). On fail, retry opens a confirm and uses `retryEnergyCost`.
- **ResumeGate**: shown when the step is running and `taskLive` is false. Buttons are `Tiếp tục` (and `Tự làm tiếp` on an agent build).
- Timer components use `useRef` for elapsed time, pass `run.revision` into every store call, stop on `document.hidden`, and commit a checkpoint at about 1s, on hidden, and on unmount. React dev StrictMode double-mount must not double-advance; the revision guard plus monotonic checkpoints cover that.
- Focus trap and Esc keep working. Every new button needs a keyboard path. With `prefers-reduced-motion` the bars still update and the status text stays.

### Job board

The `JobBoardPanel` and `JobManageBoard` buttons stay. `JobManageBoard` Làm already calls `acceptJob` / `openTask`, which now both reach the picker. Board Tiếp tục now opens a run-less active job correctly (decision 1). READY jobs show the existing Tiếp tục and land on ReadyStep.

## Phases and commits

Commit after each phase. Push after the tests of each phase are green.

0. **Verify.** Run `pnpm install` and confirm `typecheck`, `lint`, `test` and `build` are green on the branch. Re-check `PERSIST_VERSION`, the files in the facts table, and that `CustomizePanel.tsx` is untouched.
1. **Catalog + ownership + purchase (pure).** `config/agents.json`, schema, `src/game/agents/*`, `CareerState.agents` default, `buyAgent`. Tests: `tests/unit/agents.test.ts`.
2. **Save v27.** Version bump, `normalizeAgents`, the `normalizeTaskRun` defaults and v26 mapping. Tests: `tests/unit/agents-migration.test.ts`, and update `job-migration.test.ts` / `store.test.ts` where they assert the version.
3. **Task-run domain.** New steps and fields, `timing.ts`, `openTaskRun`/`beginTaskRun`, bug IDs, READY + `commitTask`, retry semantics, agent build/fix reducers, `survivingBugIds`, `agentPreview`, the `grantTaskSuccess` guard, the unlock notice. Update `taskRun.test.ts` (catching the last bug now gives READY, not success), `knowledgeJobs.test.ts`, `fulltime.test.ts`, `opening-flow.test.ts`, `job-accept-flow.test.ts`.
4. **Store wiring.** Actions, `taskLive`, the task switch confirm, faint/hospital pause, rehydrate.
5. **Shop UI.** AI Agent tab, cards, confirm, the owned group.
6. **Overlay UI.** File split, the new steps, the resume gate, checkpoints.
7. **Docs.** `task-run.md`, `save.md`, `schema.sql`; note the shop tab in `DESIGN_SYSTEM.md` (Store grid section) if the card differs.
8. **E2E + manual QA.** Playwright: a manual-only run ends at READY, then Xong pays once; buy Câupilot with debug money; agent run with N = 0 and N > 0; agent code → manual fix; reload mid-fix keeps the work; 320px shop tabs. Record a short demo.
9. **(Optional, FLAG) Single-writer tab lease.** A `localStorage` lease key plus `storage` events; the second tab is read-only with "Game đang mở ở tab khác"; begin/Xong/buy check the lease. Separate commit, and it may move to a follow-up PR.

## Test matrix (maps to SPEC §9)

| # | Test | Where |
| --- | --- | --- |
| 1 | Cancel buy spends nothing; short money blocked; double `buyAgent` → one license, one spend; reload keeps it | `agents.test.ts`, e2e |
| 1b | Price ignores Black Friday; no purchase mood; purse `shop` counts it | `agents.test.ts` |
| 2 | No agent: the full manual run reaches READY → Xong pays; skill/energy/burnout gates block agent begin exactly like manual | `taskRun.test.ts` |
| 3 | For each ID: build and fix seconds match `m`; over 20,000 seeds with B = 4 the survival rate is within ±0.01 of `q`; N = 0 reaches READY without a bug gate; same seed/coder → same IDs after normalize round-trip and retry; changing the fixer never changes IDs | `agents.test.ts`, `taskRun.test.ts` |
| 3b | BALANCE.md worked numbers (B = 1 and B = 4) | `agents.test.ts` |
| 4 | Manual code → agent fix; agent code → manual fix; agent → manual → other agent keeps `fixed_bug_ids`, `fix_partial`, `manual_left_sec` | `taskRun.test.ts` |
| 5 | First fail: retry needs energy (shared cost), keeps fixed IDs, re-rolls nothing; final fail penalizes once; no agent after final fail | `taskRun.test.ts` |
| 6 | Agent clean / manual last catch → READY with money, XP, reputation unchanged; `commitTask` twice pays once; company: 0 pay, `freelance_completed` unchanged | `taskRun.test.ts`, `fulltime.test.ts` |
| 7 | Stale revision checkpoint is a no-op; checkpoints never go backward; `start_paid` blocks a second energy charge; rehydrate gives `taskLive` false | `taskRun.test.ts`, `store.test.ts` |
| 8 | Opening a second task while one is live asks for confirmation; confirming checkpoints the first | `store.test.ts` |
| 9 | READY past the deadline → `applyJobDeadlines` fails it, Xong is a no-op; a faint closes the task and keeps the checkpoint | `job-deadlines.test.ts`, `faint.test.ts` |
| 10 | Day 1: study → bell → jobs unchanged; first task picker has agents disabled; `openingDone` flips on open; unlock notice only on the first freelance Xong; a v26 completed save pays nothing on load | `opening-flow.test.ts`, `agents-migration.test.ts` |
| 11 | 320px tabs do not overflow; keyboard reaches every action; Esc/focus trap; reduced motion; bug hit target is still 44px | e2e |
| 12 | Catalog has exactly the 3 IDs; every icon file exists; the CRT log uses text only | `agents.test.ts`, review |

## Risks

- **Double pay.** Mitigated by commit only from `ready` plus the `status` guard on `grantTaskSuccess`, by the migration never building `ready`, and by tests 6 and 10.
- **Persist churn.** Checkpoints at about 1s, not per frame. Watch for jank on low-end mobile; raise the interval if needed, since the loss on a crash is at most one interval.
- **Stale timers.** Intervals from an unmounted step, or the StrictMode double effect, could advance a run twice. The revision guard plus monotonic checkpoints cover it, and test 7 pins it.
- **Manual behavior changes.** The retry keeps fixed bugs (FLAG), the resume gate after reopen, and READY + Xong instead of an instant payout. All are spec-intended; call them out in the PR body.
- **Balance dominance.** Củsỏ + agent fix is the fastest path once it is bought. Agent fix never fails, so owning any agent removes the fail risk. The spec accepts this pending playtest. Tune price/m/q in `config/agents.json` only.
- **Test churn.** Every test that expects payment on the last catch must change to "READY, then commit". Keep `applyAccept` as the scripted one-shot helper so the unrelated suites stay small.
- **Mobile tab width.** Four Galmuri tabs at 320px is tight; verify in Playwright.
- **Scope creep.** Auto-accept and auto-submit capabilities, upgrades, resale, discounts, offline automation and robots in the room stay out.

## Out of scope

Agents that accept or submit tasks; any capability toggle or placeholder for it; LLM/API integration; 3D/GLB/Blender; room robots; `CustomizePanel.tsx`; parallel runs; balance changes beyond the three config numbers.
