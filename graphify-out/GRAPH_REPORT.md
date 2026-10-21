# Graph Report - devlife  (2026-10-21)

## Corpus Check
- 344 files · ~595,710 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: .css 13, .woff2 6, .mdc 1)

## Summary
- 2262 nodes · 5866 edges · 180 communities (102 shown, 78 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 147 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e232e636`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- events.ts
- time/index.ts
- Animation Recipes
- life/logic.ts
- GameShell.tsx
- TaskRunOverlay.tsx
- NotificationsPanel.tsx
- index.tsx
- StorePanel.tsx
- audio.test.ts
- SceneCanvas.tsx
- apply.ts
- migrate.ts
- migrate.ts
- SceneCanvas.tsx
- createAudioEngine
- m51-art.ts
- package.json
- content/index.ts
- engine.ts
- Button
- actions.ts
- store.ts
- sleep-button.test.ts
- FoodPopup.tsx
- devDependencies
- chamfer-frame.ts
- build-sfx-sprite.mjs
- PlayerInfoPanel
- knowledge/logic.ts
- settings.ts
- Life sim (M5)
- dependencies
- compilerOptions
- offers.ts
- Commands
- cues.ts
- 5. Re-render Optimization
- stat-fx.ts
- CRT Terminal UI — design doc
- 7. JavaScript Performance
- Quick Reference
- Customization & Theming
- devlife UI — PRIMARY design system (Galmuri / soft gradient)
- shell-layout.config.ts
- StudyPanel.tsx
- Styling & Customization
- scripts
- app/page.tsx
- 6. Rendering Performance
- Design Systems from DESIGN.md
- Tools
- Base vs Radix
- Component Composition
- Art backlog (from Milestone 1 plan)
- PLAN.md
- devlife M5: Life sim (ngày, chỉ số, sự kiện, thông báo, store, cá tính)
- PlayerHudCard.tsx
- cut-character.ts
- 3. Server-Side Performance
- The Design System Page
- shadcn/ui
- devlife — Milestone 1 implementation plan
- React Best Practices
- Sections
- PlayerInfoPanel.tsx
- render
- build-atlas.ts
- engine.ts
- 7. Effects & motion
- with_server.py
- Registry Authoring and Addresses
- ref_node_path
- CustomizePanel.tsx
- LocalStorageAdapter
- task-run/types.ts
- color-pair.tsx
- manifest.ts
- Step 4: Map Tokens to the Theme
- Foundations
- Chat & Messaging
- Web Application Testing
- useTweenedNumber.ts
- layout.tsx
- 1. Eliminating Waterfalls
- 2. Bundle Size Optimization
- write-m5-placeholders.mjs
- React Best Practices
- PixelButton
- motion.ts
- devlife M5.1: UI polish (síp yêu cầu 2026-10-17)
- devlife M5.2: layout fix + job management (síp 2026-10-17 21:06)
- @playwright/test
- manifest.json
- 8. Advanced Patterns
- Icons
- 6. Design tokens
- 2. Scale & coordinate system
- 7. UI
- async-cheap-condition-before-await.md
- Prefer Statically Analyzable Paths
- server-hoist-static-io.md
- Credits — devlife audio, batch 1
- CLAUDE.md
- .claude/CLAUDE.md
- advanced-effect-event-deps.md
- advanced-event-handler-refs.md
- advanced-init-once.md
- advanced-use-latest.md
- async-api-routes.md
- async-dependencies.md
- async-parallel.md
- async-suspense-boundaries.md
- bundle-barrel-imports.md
- bundle-conditional.md
- bundle-defer-third-party.md
- bundle-dynamic-imports.md
- bundle-preload.md
- client-event-listeners.md
- client-localstorage-schema.md
- client-passive-event-listeners.md
- client-swr-dedup.md
- js-batch-dom-css.md
- js-cache-function-results.md
- js-cache-property-access.md
- js-cache-storage.md
- js-combine-iterations.md
- js-early-exit.md
- js-flatmap-filter.md
- js-hoist-regexp.md
- js-index-maps.md
- js-length-check-first.md
- js-min-max-loop.md
- js-request-idle-callback.md
- js-set-map-lookups.md
- js-tosorted-immutable.md
- rendering-activity.md
- rendering-animate-svg-wrapper.md
- rendering-conditional-render.md
- rendering-content-visibility.md
- rendering-hoist-jsx.md
- rendering-hydration-no-flicker.md
- rendering-hydration-suppress-warning.md
- rendering-resource-hints.md
- rendering-script-defer-async.md
- rendering-svg-precision.md
- rendering-usetransition-loading.md
- rerender-defer-reads.md
- rerender-dependencies.md
- rerender-derived-state.md
- rerender-derived-state-no-effect.md
- rerender-functional-setstate.md
- rerender-lazy-state-init.md
- rerender-memo.md
- rerender-memo-with-default-value.md
- rerender-move-effect-to-event.md
- rerender-no-inline-components.md
- rerender-simple-expression-in-memo.md
- rerender-split-combined-hooks.md
- rerender-transitions.md
- rerender-use-deferred-value.md
- rerender-use-ref-transient-values.md
- server-after-nonblocking.md
- server-auth-actions.md
- server-cache-lru.md
- server-dedup-props.md
- server-parallel-fetching.md
- server-parallel-nested-fetching.md
- server-serialization.md
- _template.md
- skills/README.md
- postcss.config.mjs
- assets.ts
- 4. Where the terminal appears
- eslint.config.mjs

## God Nodes (most connected - your core abstractions)
1. `useGameStore` - 123 edges
2. `cn()` - 61 edges
3. `PixelButton()` - 52 edges
4. `createAudioEngine()` - 49 edges
5. `react` - 45 edges
6. `GameShell()` - 45 edges
7. `snapshot()` - 39 edges
8. `vitest` - 36 edges
9. `lifeOf()` - 33 edges
10. `LIFE` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Inputs to Confirm` --references--> `render()`  [INFERRED]
  .cursor/skills/shadcn/design-system.md → docs/tools/render_preview.py
- `1. Summary` --references--> `GameShell()`  [INFERRED]
  docs/design/TERMINAL.md → src/components/game/GameShell.tsx
- `4.1 Recommended shell pattern (proposal)` --references--> `GameShell()`  [INFERRED]
  docs/design/TERMINAL.md → src/components/game/GameShell.tsx
- `4.3 Desktop vs mobile` --references--> `GameShell()`  [INFERRED]
  docs/design/TERMINAL.md → src/components/game/GameShell.tsx
- `Adding Audio` --references--> `useGameAudio()`  [INFERRED]
  CLAUDE.md → src/components/game/useGameAudio.ts

## Import Cycles
- 2-file cycle: `src/game/career/actions.ts -> src/game/task-run/apply.ts -> src/game/career/actions.ts`

## Communities (180 total, 78 thin omitted)

### Community 0 - "events.ts"
Cohesion: 0.10
Nodes (60): applyChoiceEffects(), applyPayRent(), askStore(), bannerForDay(), captureSnapshot(), chooseLifeEvent(), LIFE_EVENTS, lifeEventById() (+52 more)

### Community 1 - "time/index.ts"
Cohesion: 0.07
Nodes (63): Courses, Energy, Events, Knowledge, Multipliers, Ranks, Skills, Add a phase (+55 more)

### Community 2 - "Animation Recipes"
Cohesion: 0.06
Nodes (31): Accordion / collapse, Animation Recipes, Button press, Drag to dismiss, Drawer / sheet, Dropdown, popover, menu, select, Hold to confirm, Masking a crossfade that won't settle (+23 more)

### Community 3 - "life/logic.ts"
Cohesion: 0.07
Nodes (41): TraitId, slotCanRoll(), advanceHunger(), applyDirect(), applyLifeDayStart(), applySleepRest(), clampStat(), crossWakingSlot() (+33 more)

### Community 4 - "GameShell.tsx"
Cohesion: 0.09
Nodes (37): defaultStates, previewState(), StateMatrix(), Helpers, States Without Interaction, TabsTrigger must be inside TabsList, Component Structure → [composition.md](./rules/composition.md), lucide-react (+29 more)

### Community 5 - "TaskRunOverlay.tsx"
Cohesion: 0.19
Nodes (19): 12. Implementation phases (suggested), BuildStep(), EventFlash(), flashStyle(), ResultStep(), skillLabel(), TaskRunOverlay(), TicketStep() (+11 more)

### Community 6 - "NotificationsPanel.tsx"
Cohesion: 0.08
Nodes (41): Actions, Rows, Thông báo, Unread badge, isHungerNotice(), actionIconFile(), BadgeSlice, listedNoticeActions() (+33 more)

### Community 7 - "index.tsx"
Cohesion: 0.11
Nodes (26): @radix-ui/react-slot, BUTTON_ASSET_FILES, BUTTON_ASSET_KEYS, BUTTON_FOCUS_PX, BUTTON_GAP_PX, BUTTON_INK, BUTTON_LIGHT, BUTTON_PAD_X_PX (+18 more)

### Community 8 - "StorePanel.tsx"
Cohesion: 0.07
Nodes (58): findAcceptingSlots(), findActiveSlot(), getOwnedItems(), OwnedItemModel, OwnedItemStatus, STORE_GRID, storeGridCss(), storeIconSize() (+50 more)

### Community 9 - "audio.test.ts"
Cohesion: 0.05
Nodes (26): bgmBedForPhase(), bgmIdForPhase(), shouldCrossfadeBgm(), AudioBufferLike, AudioContextLike, AudioNodeLike, BufferSourceLike, GainNodeLike (+18 more)

### Community 10 - "SceneCanvas.tsx"
Cohesion: 0.10
Nodes (31): 3.1 `GameShell` layout (as implemented), 9.1 State & data hooks (proposal), 8.1 Unit (vitest), nextConfig, next, DebugCanvas(), DebugPage(), CustomizePanel() (+23 more)

### Community 11 - "apply.ts"
Cohesion: 0.14
Nodes (41): grantedXp(), jobEnergyFactor(), scaleWorkXp(), applyActionStats(), jobPay(), moodBugBonus(), isNightOwlHour(), scaleTraitPay() (+33 more)

### Community 12 - "migrate.ts"
Cohesion: 0.20
Nodes (23): careerFromUnknown(), isRecord(), isSkillId(), normalizeCompletions(), normalizeDiary(), normalizeEvents(), normalizeFeed(), normalizeJobs() (+15 more)

### Community 13 - "migrate.ts"
Cohesion: 0.08
Nodes (35): DiaryPurse, JobStatus, JobTemplateXp, JobType, LifeDiary, LifeFeed, LifeSnapshot, LifeState (+27 more)

### Community 14 - "SceneCanvas.tsx"
Cohesion: 0.08
Nodes (33): ATLAS_JSON_URL, ATLAS_URL, CHAR_DOWNSCALE, CHAR_KEY, CHAR_POSE_SIT_BACK, DEFAULT_LETTERBOX, FLOOR_SIT_OFFSET_Y, MIN_VIEW_W (+25 more)

### Community 15 - "createAudioEngine"
Cohesion: 0.13
Nodes (31): resolveCueKey(), createAudioEngine(), beginLoopBuffer(), beginLoopElement(), busFor(), cueForKey(), fallBackToElements(), flushQueued() (+23 more)

### Community 16 - "m51-art.ts"
Cohesion: 0.10
Nodes (34): art(), DiarySpends(), LifeRoomFx(), LifeStage(), signed(), ACTION_EAT_NATIVE_PX, actionEatArtFile(), BANNER_TEXT_BOX (+26 more)

### Community 17 - "package.json"
Cohesion: 0.07
Nodes (28): name, private, version, class-variance-authority, clsx, eslint, eslint-config-next, jsdom (+20 more)

### Community 18 - "content/index.ts"
Cohesion: 0.09
Nodes (24): zod, ATLAS_JSON, ATLAS_PNG, checkHardAlpha(), fail(), main(), ROOT, STAGES (+16 more)

### Community 19 - "engine.ts"
Cohesion: 0.14
Nodes (16): ContextCtor, createAudioContextFrom(), createBrowserAudioContext(), createFileAudioElement(), createSilentKeepAlive(), decodeAudioBuffer(), DecodeHost, enablePlaybackSession() (+8 more)

### Community 20 - "Button"
Cohesion: 0.15
Nodes (20): Step 5: Map Component Recipes to Variants, Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea (+12 more)

### Community 21 - "actions.ts"
Cohesion: 0.14
Nodes (27): ActionResult, applyStudy(), changeMoney(), draft(), fail(), fillEnergy(), grantRawXp(), grantToSkill() (+19 more)

### Community 22 - "store.ts"
Cohesion: 0.14
Nodes (32): playCueKey(), CueKey, applyDayStarted(), applyWake(), syncPlayerClock(), foodById(), LifeStep, eatMeal() (+24 more)

### Community 23 - "sleep-button.test.ts"
Cohesion: 0.13
Nodes (20): pngjs, FX_ZZZ, fxZzz, SLEEP_ICON_NATIVE_PX, SLEEP_LABEL, sleepZzzFile(), SpriteAnim, ZZZ_ANCHOR_NATIVE (+12 more)

### Community 24 - "FoodPopup.tsx"
Cohesion: 0.17
Nodes (19): Meals, FOOD_TIP_ACTION, foodButtonMetrics(), foodHungerTip(), HUNGER_BOWL_BLINK, HungerBlinkLevel, hungerBowlBlinkStyle(), FOOD_GRID (+11 more)

### Community 25 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, eslint, eslint-config-next, @eslint/eslintrc, jsdom, maxrects-packer, pixelmatch, @playwright/test (+13 more)

### Community 26 - "chamfer-frame.ts"
Cohesion: 0.23
Nodes (15): Chamfered game frame, LayerProps, PanelChamferFrame(), PanelChamferLayer(), ChamferLayer(), LayerProps, Props, RoomChamferFrame() (+7 more)

### Community 27 - "build-sfx-sprite.mjs"
Cohesion: 0.11
Nodes (11): bgm, decodeToWav(), GAP_SAMPLES, MANIFEST, OUT_DIR, ROOT, run(), seconds() (+3 more)

### Community 28 - "PlayerInfoPanel"
Cohesion: 0.16
Nodes (18): Avatars (`public/ui/avatars/`), CharacterIntro(), PixelAvatar(), Props, PlayerInfoPanel(), TRAIT_IDS, INTRO_SPIN_MS, introIndex() (+10 more)

### Community 29 - "knowledge/logic.ts"
Cohesion: 0.16
Nodes (17): HUD & stat bars, GameConfig, SkillLevelXp, StudyActivity, XpSource, canStudyCourse(), formatRankLabel(), formatSkillXpLine() (+9 more)

### Community 30 - "settings.ts"
Cohesion: 0.17
Nodes (17): applyGains(), clamp01(), AUDIO_SETTINGS_VERSION, AUDIO_STORAGE_KEY, AudioLevels, AudioSettingsStorage, configuredVolume(), DEFAULT_AUDIO_LEVELS (+9 more)

### Community 31 - "Life sim (M5)"
Cohesion: 0.22
Nodes (9): Bills, Calendar, Events, Life sim (M5), Personality, Save, Stats, Store (+1 more)

### Community 32 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority, clsx, lucide-react, next, @radix-ui/react-dialog, @radix-ui/react-label, @radix-ui/react-scroll-area (+11 more)

### Community 33 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 34 - "offers.ts"
Cohesion: 0.05
Nodes (72): vitest, BlockedButton(), JobBoardPanel(), names, deadlineLabel(), difficultyLabel(), JobManageBoard(), defaultCareer() (+64 more)

### Community 35 - "Commands"
Cohesion: 0.12
Nodes (17): `add` — Add components, `apply` — Apply a preset to an existing project, `build` — Build a custom registry, Commands, Contents, `diff` — Check for updates, `docs` — Get component documentation URLs, Dry-Run Mode (+9 more)

### Community 36 - "cues.ts"
Cohesion: 0.11
Nodes (26): controlElement(), describePointerTarget(), useGameAudio(), attachAudioEngine(), BGM_DAY_ID, BGM_NIGHT_ID, BgmBed, CUE_IDS (+18 more)

### Community 37 - "5. Re-render Optimization"
Cohesion: 0.12
Nodes (16): 5.10 Subscribe to Derived State, 5.11 Use Functional setState Updates, 5.12 Use Lazy State Initialization, 5.13 Use Transitions for Non-Urgent Updates, 5.14 Use useDeferredValue for Expensive Derived Renders, 5.15 Use useRef for Transient Values, 5.1 Calculate Derived State During Rendering, 5.2 Defer State Reads to Usage Point (+8 more)

### Community 38 - "stat-fx.ts"
Cohesion: 0.17
Nodes (20): STAT_FX, diffStats(), easeOutCubic(), FloaterSpec, FloaterTone, MINUS, moneyLabel(), sampleCareer() (+12 more)

### Community 39 - "CRT Terminal UI — design doc"
Cohesion: 0.12
Nodes (16): 10. Navigation model (proposal), 11. Open questions, 1. Summary, 2.1 Non-goals, 2. Goals, 3.2 Placeholder panels, 3.3 Room interaction (proposal), 3. Context: current architecture (+8 more)

### Community 40 - "7. JavaScript Performance"
Cohesion: 0.13
Nodes (15): 7.10 Hoist RegExp Creation, 7.11 Use flatMap to Map and Filter in One Pass, 7.12 Use Loop for Min/Max Instead of Sort, 7.13 Use Set/Map for O(1) Lookups, 7.14 Use toSorted() Instead of sort() for Immutability, 7.1 Avoid Layout Thrashing, 7.2 Build Index Maps for Repeated Lookups, 7.3 Cache Property Access in Loops (+7 more)

### Community 41 - "Quick Reference"
Cohesion: 0.13
Nodes (14): 1. Eliminating Waterfalls (CRITICAL), 2. Bundle Size Optimization (CRITICAL), 3. Server-Side Performance (HIGH), 4. Client-Side Data Fetching (MEDIUM-HIGH), 5. Re-render Optimization (MEDIUM), 6. Rendering Performance (MEDIUM), 7. JavaScript Performance (LOW-MEDIUM), 8. Advanced Patterns (LOW) (+6 more)

### Community 42 - "Customization & Theming"
Cohesion: 0.14
Nodes (14): 1. Built-in variants, 2. Tailwind classes via `className`, 3. Add a new variant, 4. Wrapper components, Adding Custom Colors, Border Radius, Changing the Theme, Checking for Updates (+6 more)

### Community 43 - "devlife UI — PRIMARY design system (Galmuri / soft gradient)"
Cohesion: 0.13
Nodes (15): Background, Canvas exception, Color tokens, devlife UI — PRIMARY design system (Galmuri / soft gradient), Event popup, Layout (desktop), Modal, Philosophy (+7 more)

### Community 44 - "shell-layout.config.ts"
Cohesion: 0.22
Nodes (14): LIFE_EVENT_POPUP, lifeEventPopupLayerOk(), lifeEventPopupStyle(), CENTER_COLUMN_MAX_PX, ROOM_STATUS_BAR, ROOM_VIEWPORT_W, roomStatusBarVars(), roomStatusClockLabel() (+6 more)

### Community 45 - "StudyPanel.tsx"
Cohesion: 0.22
Nodes (16): Icons (`public/ui/icons/`), Phases, PixelButtonSpecimenPage(), AudioControls(), AudioSlider(), VolumeMark(), CourseEmpty(), CourseOffer() (+8 more)

### Community 46 - "Styling & Customization"
Cohesion: 0.15
Nodes (13): Built-in variants first, className for layout only, Contents, No manual dark: color overrides, No manual z-index on overlay components, No raw color values for status/state indicators, No space-x-* / space-y-*, Prefer size-* over w-* h-* when equal (+5 more)

### Community 47 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, assets, assets:atlas, assets:check, assets:cut, audio:sprite, build, dev (+5 more)

### Community 48 - "app/page.tsx"
Cohesion: 0.60
Nodes (3): Home(), ICONS_DIR, listUiIconFiles()

### Community 49 - "6. Rendering Performance"
Cohesion: 0.17
Nodes (12): 6.10 Use React DOM Resource Hints, 6.11 Use useTransition Over Manual Loading States, 6.1 Animate SVG Wrapper Instead of SVG Element, 6.2 CSS content-visibility for Long Lists, 6.3 Hoist Static JSX Elements, 6.4 Optimize SVG Precision, 6.5 Prevent Hydration Mismatch Without Flickering, 6.6 Suppress Expected Hydration Mismatches (+4 more)

### Community 50 - "Design Systems from DESIGN.md"
Cohesion: 0.17
Nodes (12): Contents, Coverage check, Design Systems from DESIGN.md, Inputs to Confirm, Known traps, Picking a style, Report Back, Step 1: Scaffold (+4 more)

### Community 51 - "Tools"
Cohesion: 0.17
Nodes (11): Configuring Registries, Setup, `shadcn:get_add_command_for_items`, `shadcn:get_audit_checklist`, `shadcn:get_item_examples_from_registries`, `shadcn:get_project_registries`, `shadcn:list_items_in_registries`, shadcn MCP Server (+3 more)

### Community 52 - "Base vs Radix"
Cohesion: 0.17
Nodes (12): Accordion, Base vs Radix, Button / trigger as non-button element (base only), Composition: asChild (radix) vs render (base), Contents, Select, Select — multiple selection and object values (base only), Slider (+4 more)

### Community 53 - "Component Composition"
Cohesion: 0.17
Nodes (12): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+4 more)

### Community 54 - "Art backlog (from Milestone 1 plan)"
Cohesion: 0.15
Nodes (11): Art backlog (from Milestone 1 plan), Constraints, M5.4 Chơi game, Redraw at native scale (priority), Resample quality, Asset pipeline, Debug overlay, devlife (+3 more)

### Community 56 - "devlife M5: Life sim (ngày, chỉ số, sự kiện, thông báo, store, cá tính)"
Cohesion: 0.15
Nodes (12): 1. Thời gian, 2. Chỉ số & thuật toán (statConfig), 3. Tiền (tháng, đóng ngày 1; lương ngày 10), 4. Sự kiện ngẫu nhiên (eventConfig), 5. Thông báo (tab Thông báo panel trái - đang bỏ trống), 6. UX hiển thị, 7. Store, 8. Cá tính (random 1 khi tạo nhân vật) (+4 more)

### Community 57 - "PlayerHudCard.tsx"
Cohesion: 0.19
Nodes (16): CAREER_ACTIONS, CareerHudButton(), HudVital(), PhaseMark(), PlayerHudCard(), RoomStatusBar(), SKILL_MENU_ICON, statFxVars() (+8 more)

### Community 58 - "cut-character.ts"
Cohesion: 0.26
Nodes (10): ALPHA_SOFT, CHAR_DOWNSCALE, CHAR_KEY, POSES, cutPose(), distKey(), main(), OUT_DIR (+2 more)

### Community 59 - "3. Server-Side Performance"
Cohesion: 0.18
Nodes (10): 3.10 Use after() for Non-Blocking Operations, 3.1 Authenticate Server Actions Like API Routes, 3.2 Avoid Duplicate Serialization in RSC Props, 3.3 Avoid Shared Module State for Request Data, 3.4 Cross-Request LRU Caching, 3.5 Hoist Static I/O to Module Level, 3.6 Minimize Serialization at RSC Boundaries, 3.7 Parallel Data Fetching with Component Composition (+2 more)

### Community 61 - "The Design System Page"
Cohesion: 0.18
Nodes (11): Block anatomy, Checklist, Components: Tiers and Block Anatomy, Contents, Do and Don't, Edge Cases, Page Outline, Principles (+3 more)

### Community 62 - "shadcn/ui"
Cohesion: 0.18
Nodes (11): Component Docs, Examples, and Usage, Current Project Context, Design Systems from DESIGN.md, Detailed References, Key Fields, Key Patterns, Principles, Quick Reference (+3 more)

### Community 63 - "devlife — Milestone 1 implementation plan"
Cohesion: 0.14
Nodes (14): 0. TL;DR, 10. Day/night clock, 11. Knowledge and jobs, 1. Repository inventory (what is already committed), 3.1 Texture atlas packing, 3. Rendering choice, 4. Folder structure, 5. Data model (+6 more)

### Community 64 - "React Best Practices"
Cohesion: 0.20
Nodes (9): 4.1 Deduplicate Global Event Listeners, 4.2 Use Passive Event Listeners for Scrolling Performance, 4.3 Use SWR for Automatic Deduplication, 4.4 Version and Minimize localStorage Data, 4. Client-Side Data Fetching, Abstract, React Best Practices, References (+1 more)

### Community 65 - "Sections"
Cohesion: 0.20
Nodes (9): 1. Eliminating Waterfalls (async), 2. Bundle Size Optimization (bundle), 3. Server-Side Performance (server), 4. Client-Side Data Fetching (client), 5. Re-render Optimization (rerender), 6. Rendering Performance (rendering), 7. JavaScript Performance (js), 8. Advanced Patterns (advanced) (+1 more)

### Community 66 - "PlayerInfoPanel.tsx"
Cohesion: 0.23
Nodes (12): CareerChrome(), FloatNote, LevelPopup, useCareerSim(), RankBadge(), goal, SkillRankPanel(), goal (+4 more)

### Community 67 - "render"
Cohesion: 0.31
Nodes (5): 9. Step-by-step task list for the implementer, cut_pose(), load(), render(), resolve()

### Community 68 - "build-atlas.ts"
Cohesion: 0.24
Nodes (9): maxrects-packer, sharp, ASSETS, listSprites(), loadTrimmed(), main(), OUT_DIR, PackInput (+1 more)

### Community 69 - "engine.ts"
Cohesion: 0.11
Nodes (22): AudioEngine, AudioEngineOptions, AudioFetch, AudioResponseLike, GainParamLike, KeepAliveHandle, LiveBed, LiveLoop (+14 more)

### Community 70 - "7. Effects & motion"
Cohesion: 0.22
Nodes (9): 7.1 CRT scanline overlay, 7.2 Phosphor glow, 7.3 Blinking block cursor, 7.4 `[x]` bullets, 7.5 Text selection, 7.6 Background radial glow, 7.7 `prefers-reduced-motion`, 7.8 Accessibility & contrast (+1 more)

### Community 72 - "Registry Authoring and Addresses"
Cohesion: 0.22
Nodes (9): Address Schemes, Build and Verify, GitHub Registries, Include, Item Definitions, Mental Model, Registry Authoring and Addresses, Registry Dependencies (+1 more)

### Community 73 - "ref_node_path"
Cohesion: 0.17
Nodes (6): components, missing, source, [uiArg, ...roots], uiDir, walk()

### Community 74 - "CustomizePanel.tsx"
Cohesion: 0.28
Nodes (6): ItemThumb(), Props, LoadedAtlas, Localized, AppLocale, DEFAULT_LOCALE

### Community 75 - "LocalStorageAdapter"
Cohesion: 0.09
Nodes (16): Board, Jobs, Milestones, Nhận, Save, Bug count, Events, Save (+8 more)

### Community 76 - "task-run/types.ts"
Cohesion: 0.13
Nodes (18): SkillId, TaskBuildChoice, TaskOutcome, TaskRun, TaskStep, TaskTicketChoice, bugSpots(), mulberry32() (+10 more)

### Community 77 - "color-pair.tsx"
Cohesion: 0.60
Nodes (5): ColorPair(), contrast(), luminance(), toHex(), toRgb()

### Community 78 - "manifest.ts"
Cohesion: 0.27
Nodes (9): indexManifest(), asCue(), AudioCategory, AudioCue, AudioCueType, cueCategory(), cueRows(), parseManifest() (+1 more)

### Community 79 - "Step 4: Map Tokens to the Theme"
Cohesion: 0.25
Nodes (8): Dark mode, Elevation, Focus, Fonts, Radius, Role mapping, Step 4: Map Tokens to the Theme, Type scale

### Community 80 - "Foundations"
Cohesion: 0.25
Nodes (8): Color roles, Elevation, Foundations, Motion and icons, Palette, Radius, Spacing, Typography

### Community 81 - "Chat & Messaging"
Cohesion: 0.25
Nodes (8): Chat & Messaging, Contents, Escape hatch: the scroller hooks, Message rows use Message, Message surfaces use Bubble, Scrollable threads use MessageScroller, Streaming, anchoring, and jump-to-latest are built in, System notes and dividers use Marker

### Community 82 - "Web Application Testing"
Cohesion: 0.25
Nodes (7): Best Practices, Common Pitfall, Decision Tree: Choosing Your Approach, Example: Using with_server.py, Reconnaissance-Then-Action Pattern, Reference Files, Web Application Testing

### Community 83 - "useTweenedNumber.ts"
Cohesion: 0.53
Nodes (4): Motion & a11y, prefersReducedMotion(), REDUCED_MOTION_QUERY, usePrefersReducedMotion()

### Community 84 - "layout.tsx"
Cohesion: 0.25
Nodes (5): galmuri11, galmuri7, galmuri9, metadata, terminalFont

### Community 85 - "1. Eliminating Waterfalls"
Cohesion: 0.29
Nodes (7): 1.1 Check Cheap Conditions Before Async Flags, 1.2 Defer Await Until Needed, 1.3 Dependency-Based Parallelization, 1.4 Prevent Waterfall Chains in API Routes, 1.5 Promise.all() for Independent Operations, 1.6 Strategic Suspense Boundaries, 1. Eliminating Waterfalls

### Community 86 - "2. Bundle Size Optimization"
Cohesion: 0.29
Nodes (7): 2.1 Avoid Barrel File Imports, 2.2 Conditional Module Loading, 2.3 Defer Non-Critical Third-Party Libraries, 2.4 Dynamic Imports for Heavy Components, 2.5 Prefer Statically Analyzable Paths, 2.6 Preload Based on User Intent, 2. Bundle Size Optimization

### Community 87 - "write-m5-placeholders.mjs"
Cohesion: 0.38
Nodes (5): chunk(), crc32(), keys, png(), root

### Community 88 - "React Best Practices"
Cohesion: 0.33
Nodes (5): Creating a New Rule, Getting Started, React Best Practices, Rule File Structure, Structure

### Community 89 - "PixelButton"
Cohesion: 0.11
Nodes (36): Game, Light, Notice actions, Pixel buttons, Press, Skins, Sleep, Store (+28 more)

### Community 91 - "motion.ts"
Cohesion: 0.29
Nodes (13): TestStep(), useReducedMotion(), bounds(), bugHitPx(), bugMotionRand(), mulberry32(), pickSize(), scaleOf() (+5 more)

### Community 92 - "devlife M5.1: UI polish (síp yêu cầu 2026-10-17)"
Cohesion: 0.33
Nodes (5): Asset keys mới (Art -> /workspace/devlife-art/out/m5_1/, native + _x2), Dev A (Devlife Code), Dev B (Devlife Code 2), devlife M5.1: UI polish (síp yêu cầu 2026-10-17), Đồng bộ

### Community 93 - "devlife M5.2: layout fix + job management (síp 2026-10-17 21:06)"
Cohesion: 0.33
Nodes (5): devlife M5.2: layout fix + job management (síp 2026-10-17 21:06), J. Hệ thống job mới — Dev A (Devlife Code), L. Layout (CHỜ mockup Art -> síp duyệt rồi mới code) — Dev B (Devlife Code 2), N. Không đổi layout (làm ngay) — Dev B (Devlife Code 2), Đồng bộ

### Community 95 - "manifest.json"
Cohesion: 0.33
Nodes (5): assets, batch, license, project, sample_rate

### Community 96 - "8. Advanced Patterns"
Cohesion: 0.40
Nodes (5): 8.1 Do Not Put Effect Events in Dependency Arrays, 8.2 Initialize App Once, Not Per Mount, 8.3 Store Event Handlers in Refs, 8.4 useEffectEvent for Stable Callback Refs, 8. Advanced Patterns

### Community 97 - "Icons"
Cohesion: 0.40
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

### Community 98 - "6. Design tokens"
Cohesion: 0.33
Nodes (6): 6.1 Color, 6.2 Typography, 6.3 Glow (text-shadow), 6.4 Spacing & layout, 6.5 Tailwind 4 integration (suggested), 6. Design tokens

### Community 99 - "2. Scale & coordinate system"
Cohesion: 0.40
Nodes (5): 2.1 Measurements, 2.2 Decisions, 2.3 Items whose scale looks off & normalisation policy, 2.4 Character cut-out and seating, 2. Scale & coordinate system

### Community 100 - "7. UI"
Cohesion: 0.40
Nodes (5): 7.1 Layout, 7.2 Interactions, 7.3 States, 7.4 Debug overlay (dev only; `?debug=1` or `D` key), 7. UI

### Community 102 - "Prefer Statically Analyzable Paths"
Cohesion: 0.50
Nodes (3): File-System Paths, Import Paths, Prefer Statically Analyzable Paths

### Community 104 - "Credits — devlife audio, batch 1"
Cohesion: 0.50
Nodes (3): Credits — devlife audio, batch 1, Exception: typing loops (not procedural, not CC0), M5 life sim (procedural, CC0)

### Community 105 - "CLAUDE.md"
Cohesion: 0.08
Nodes (24): Adding a New Furniture Item, Adding a New Job, Adding Audio, Architecture, Asset Pipeline Details, Build check, Common Tasks, Component Structure (+16 more)

### Community 177 - "assets.ts"
Cohesion: 0.39
Nodes (5): art(), LifeEventPopup(), M5_ASSET_KEYS, M5AssetKey, m5AssetPath()

### Community 178 - "4. Where the terminal appears"
Cohesion: 0.40
Nodes (5): 4.1 Recommended shell pattern (proposal), 4.2 Alternatives (not recommended for v1), 4.3 Desktop vs mobile, 4.4 Coexistence with pixel canvas, 4. Where the terminal appears

### Community 180 - "eslint.config.mjs"
Cohesion: 0.25
Nodes (5): compat, __dirname, eslintConfig, __filename, @eslint/eslintrc

## Knowledge Gaps
- **18 isolated node(s):** `@radix-ui/react-label`, `@radix-ui/react-separator`, `@radix-ui/react-toggle-group`, `react-dom`, `@tailwindcss/postcss` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 944 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **78 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useGameStore` connect `store.ts` to `events.ts`, `time/index.ts`, `life/logic.ts`, `GameShell.tsx`, `TaskRunOverlay.tsx`, `NotificationsPanel.tsx`, `StorePanel.tsx`, `SceneCanvas.tsx`, `apply.ts`, `m51-art.ts`, `actions.ts`, `FoodPopup.tsx`, `PlayerInfoPanel`, `offers.ts`, `cues.ts`, `stat-fx.ts`, `StudyPanel.tsx`, `assets.ts`, `PlayerHudCard.tsx`, `PlayerInfoPanel.tsx`, `CustomizePanel.tsx`, `LocalStorageAdapter`, `PixelButton`, `motion.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `cn()` (e.g. with `Helpers` and `Type scale`) actually correct?**
  _`cn()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@radix-ui/react-label`, `@radix-ui/react-separator`, `@radix-ui/react-toggle-group` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `events.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09951923076923076 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `offers.ts` to `events.ts`, `time/index.ts`, `life/logic.ts`, `NotificationsPanel.tsx`, `index.tsx`, `StorePanel.tsx`, `audio.test.ts`, `SceneCanvas.tsx`, `apply.ts`, `migrate.ts`, `m51-art.ts`, `package.json`, `content/index.ts`, `store.ts`, `sleep-button.test.ts`, `FoodPopup.tsx`, `chamfer-frame.ts`, `stat-fx.ts`, `shell-layout.config.ts`, `ref_node_path`, `PixelButton`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `PixelButton()` (e.g. with `Chamfered game frame` and `HUD & stat bars`) actually correct?**
  _`PixelButton()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Should `time/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06558558558558558 - nodes in this community are weakly interconnected._