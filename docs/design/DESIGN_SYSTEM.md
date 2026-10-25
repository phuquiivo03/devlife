# devlife UI — PRIMARY design system (Claymorphism on the pastel lavender palette)

**This is the PRIMARY design system for devlife.** All UI in this repository must follow it unless the owner explicitly names another style for a feature (for example, the in-game terminal uses [TERMINAL.md](./TERMINAL.md)).

---

## Philosophy

High-fidelity **claymorphism**: the chrome behaves like soft, matte digital clay — surfaces are borderless, super-rounded, and shaped entirely by multi-layer light stacks (drop shadow + top-left light + inner bounce + inner rim). Controls bulge toward the viewer, lift on hover, and squish into the surface when pressed. The **color palette is the pastel lavender–pink set this project always had** — clay changes material (borders, shadows, radii, type, motion), never color. Pixel art stays for world assets (room, icons, avatars) and the in-canvas chrome.

The room scene lives in one big rounded card that fills the left column; game chrome (stats, actions, profile) sits in white cards on the right.

---

## Clay material (the style definition)

All tokens live in `:root` in `src/app/globals.css`.

### Shadows — 4-layer light stacks

Every surface is lit by a soft top-left source. Shadows are violet-tinted (`rgba(124, 107, 217, …)`), never neutral black. Values are scaled down from the reference claymorphism system to fit the compact game HUD.

| Token | Stack | Used by |
|-------|-------|---------|
| `--clay-shadow-panel` | `10px 12px 26px` violet drop, `-6px -8px 18px` white top-left light, `inset 4px 4px 10px` violet bounce, `inset -4px -4px 10px` white rim | Cards (`shadow-panel`), top bar, modal |
| `--clay-shadow-panel-hover` | same structure, deeper drop | Card hover (future use) |
| `--clay-shadow-chip` | `3px 4px 10px` drop + white light + inner rim | `hud-chip`, tooltips, stage pill, list row tiles (`shadow-chip`), active tab |
| `--clay-shadow-ctrl` | `6px 8px 16px` drop + `-4px -5px 12px` light + inner white rim + inset bottom shade | Buttons (`[data-variant]`, `PixelButton`, `btn-soft`), clay tiles |
| `--clay-shadow-ctrl-hover` | stronger drop + light | control hover |
| `--clay-pressed` | `inset 5px 5px 12px` violet + `inset -4px -4px 10px` white lip | `:active` on controls |
| `--clay-recessed` | soft `inset 3px 3px 7px` + white lip | Tab tracks, stat bar tracks (`.stat-track`), input wells |
| stat fill edge (`.clay-stat-fill`) | `inset 2px 2px 4px` white rim + `inset -2px -2px 4px` dark shade + `0 1px 3px` drop | Stat pill fills — the button edge, lighter |
| stat fill edge, thin (`.stat-fill`) | same at 1px scale | Fills inside 10px `.stat-track` bars |

`@utility shadow-panel` / `shadow-chip` map to the panel/chip stacks. **One-layer `0 8px 24px` shadows are gone** — do not reintroduce them.

### Radii — super-rounded, absolute values only

| Token | Value | Used by |
|-------|-------|---------|
| `--radius-panel` | 24px | Cards, scene card, modal content |
| `--radius-ctrl` | 20px | Buttons and interactive controls (PixelButton default) |
| `--radius-tile` | 18px | Nested tiles inside cards (career rows, tooltips) — outer −6px |
| `--radius-chip` | 999px | Pills: chips, stat tracks, round icon buttons |

Never use `rounded-sm`/`rounded-md` on chrome. Round icon buttons pass `--btn-radius: 999px`.

### Borders — none on chrome

Cards and controls are **borderless**; the shadow stack is the edge. `--panel-border` (#E7DFF2) survives as a **divider/hairline color only** (skills rows, job table separators). The legacy `--btn-light-border` token is kept because `buttons.test.ts` pins it, but no button draws a border anymore.

### Typography — Nunito UI face

`--font-ui: var(--font-nunito), var(--font-galmuri-9), system-ui` is the face for **everything**: body, buttons, chips, titles. The `.font-galmuri-7/9/11` classes keep their names and size roles but resolve to `--font-ui` — treat them as size classes (`text-galmuri-*`), not face classes. Nunito ships 600/700/800; weight-400 text renders at 600 (nearest match). Galmuri remains the fallback and the face of the pixel canvas art. The terminal keeps JetBrains Mono ([TERMINAL.md](./TERMINAL.md)).

### Motion — clay physics

- **Hover lift**: controls rise `translateY(-1px)` with the stronger ctrl-hover stack (`[data-variant]`, `.btn-soft`, `.clay-tile`, `.audio-mute`).
- **Press squish**: `:active` scales the box to `0.95` and swaps to `--clay-pressed`. The pixel-era label press-drop (`--btn-press`) is cancelled project-wide (the module rule stays only because tests pin it).
- Transitions: `140ms ease` on `background-color / box-shadow / transform / opacity`.
- All of it switches off under `prefers-reduced-motion`.

---

## Background

CSS only, in one stack (utility `devlife-page-bg` on `html`/`body`):

- Gradient: `linear-gradient(135deg, #E9E4F6 0%, #F3ECF9 45%, #F9EEF5 75%, #FDF0F5 100%)`
- Two soft white radial glows (top-left, bottom-right)
- Fixed attachment

Do **not** split the background layers into two classes — the second `background-image` wins and hides the gradient. There is no dark grid anymore; the page stays light at every stage.

---

## Layout

`GameShell` renders, inside `max-w-[1280px]`:

| Row | Content |
|-----|---------|
| Header | `TopBar` — white rounded pill, full width |
| Main grid (`lg:grid-cols-[minmax(0,1fr)_360px]`, 20px gap) | Left: `SceneCard`. Right: sidebar cards |

- **`lg` and up:** shell is `h-screen`, `overflow-hidden`. The sidebar scrolls internally (`lg:overflow-y-auto`); the main column scrolls internally. Below `lg` the page stacks and scrolls as a whole: **top bar → scene → profile → stats → actions → skills**.
- Sidebar cards in order: **Profile** (`ProfileCard`), **Stats** (`StatsCard`), **Actions** (`ActionsCard`), **Skills** (`SkillsCard`, collapsed by default). Dev-only tabs `Nhân vật` / `Sửa phòng` (Radix Tabs, `tabs-lavender`) sit above the profile card when `NODE_ENV !== production` or `?debug=1`.
- Direct children of the sidebar flex column carry `shrink-0` — the aside is a flex column with `lg:overflow-y-auto`, and without it flex-shrink crushes the tabs block to height 0 (content then overlaps the cards below).
- `shell-layout.config.ts` still exports `SHELL_LAYOUT` (z-floor bookkeeping) and `ROOM_STATUS_BAR` (top-bar metrics), but the old sticky-panel measurement (`shellPanelVars`, `--shell-panel-h`) is retired.

### Top bar (`TopBar` in `PlayerHudCard.tsx`)

One white `PanelCard` pill, `data-testid="room-status-bar"`:

- Left: `devlife` wordmark (Galmuri11 bold, violet dot before it)
- Center: two `hud-chip` pills — **Tiền** (`savings` icon + VND, `hud-money`, mint when positive, coral when not, tween + Stat FX) and **Ngày/giờ** (phase icon + `Ngày N · weekday · HH:MM phase`, `game-clock` with the full data-attr set; fast-forward still flashes the cluster). Chips are `whitespace-nowrap`; on narrow bars they wrap whole, never mid-text.
- Right: `NotificationsButton` and `AudioButton` in **compact** mode — 48px round `PixelButton icon` faces with the unread badge on the bell.

### Scene card (`SceneCard.tsx`)

A borderless transparent slot (`scene-bare` — no card face, plate, or glow), `aria-label="Phòng"`:

- Stage label pill pinned top-left (`left-3 top-3`, white/90, truncates) — **debug only**.
- The slot fills the column as a fixed 4:3 well; `Scene3D` paints the deep-purple `.clay-scene-well` gradient itself and the room floats on the page background.
- The 2D pixel canvas, its renderer, and the `/debug` route have been removed — the R3F room is the only renderer (the old 480px `ROOM_VIEWPORT_W` cap stays retired).
- Room overlays mount inside the card on a `relative` wrapper over the canvas: `LifeRoomFx`, `LifeEventPopup`, `SleepTransition`. Nothing dims the room behind popups.

---

## Color tokens

**Unchanged by the clay restyle** — clay is a material change, not a palette change.

| Token | Value | Use |
|-------|-------|-----|
| panel bg | `#FFFFFF` | Cards, top bar |
| panel border | `#E7DFF2` | Divider hairlines only (skills rows, job table) — never card edges |
| foreground | `#2A2548` | Text |
| muted foreground | `#6B6390` | Secondary text |
| accent violet | `#7C6BD9` | Primary buttons, links, XP, ring |
| coral | `#F0625F` | Health bars, danger |
| mint | `#5CCB9A` | Mood, EXP, money |
| sky | `#4A90E2` | Energy |
| amber | `#F5A623` | Fullness, Cửa hàng button (border `#D9941A`) |
| pill coral / mint / sky / amber | `#FDE7E6` / `#E3F6EE` / `#E4EFFA` / `#FCEED4` | Stat label pill fills (ink `#C24744` / `#2F8F68` / `#33689F` / `#A66A0B`) |
| tab lavender | `#EFEAF8` | Inactive tab wells, stat track wells |
| chip bg | `#F6F2FB` | Hover fills |
| scene plate | `#F1ECF9` | Scene card floor, avatar frame bg |
| room frame | `#D9CDEF` | Avatar frame border |

Shadows and radii: see **Clay material** above.

---

## Typography

Face: **Nunito** (`--font-ui`, weights 600/700/800, vietnamese subset, next/font). Sizes keep the pixel-era scale, applied through the same classes:

| Role | Class | Size |
|------|-------|------|
| Body | `font-galmuri-9` + `text-galmuri-body` | 20px |
| Titles | `font-galmuri-11` + `text-galmuri-title` | 24px (title-lg 28px) |
| Small | `font-galmuri-7` + `text-galmuri-small` | 16px |
| HUD chips | `.hud-chip` | 15px / 700 |

Integer px sizes only. User-facing copy is **Vietnamese**; tech terms stay English. Galmuri stays self-hosted as the fallback (`src/app/fonts/`).

---

## Buttons — clay PixelButton skin

`PixelButton` from `@/components/ui/button` keeps its API (`primary`, `secondary`, `light`, `danger`, `icon`); the chrome is the shared clay control skin (`pixel-button.module.css` + the global `[data-variant]` rules).

- Base: borderless, radius `var(--btn-radius, 20px)` (round icon faces pass `999px`), fill from `--btn-skin-bg` per `data-variant`, ink from `--btn-ink`, `--clay-shadow-ctrl` stack, Nunito with weight fallback 700.
- Physics: hover `translateY(-1px)` + ctrl-hover stack; active `scale(.95)` + `--clay-pressed` (the squish lives in globals.css — the module box never transforms).
- Faces: `primary` violet / white ink, `secondary` white, `light` lavender `#E8E2F4` tile (the dark pixel border color survives only inside the pinned `--btn-light-*` tokens), `danger` coral, `icon` white.
- `light` numbers stay pinned in `BUTTON_LIGHT` (`button/config.ts`) and mirrored `--btn-light-*` in `globals.css`.
- The amber **Cửa hàng** bar is `StoreButton wide`: a `variant="icon"` button overridden with `--btn-skin-bg: var(--accent-amber)`, white ink, full width, icon 24px + label inside.

---

## Pixel art

Room canvas, UI icons, avatars: `image-rendering: pixelated` (`.pixelated`). Do not blur or round canvas pixels.

### Icons (`public/ui/icons/`)

Art-agent PNGs with clean alpha. Naming `icon_<name>.png` / `icon_<name>_x4.png`; icons 44×44 native, 176×176 ×4. Phase clock: `morning`, `noon`, `evening`, `night`. HUD menu: `skills`, `learn_book` (Học), `job` (Việc làm). Use `PixelIcon` + `resolveIconAsset()` so display size is an integer scale of the sheet.

### Avatars (`public/ui/avatars/`)

Framed 48×48 native (192×192 ×4), roles `player`, `boss`, … Use `PixelAvatar`. On the profile card: 80px inside a `rounded-2xl` lavender frame (`--scene-plate` bg, `--room-frame` border).

### In-canvas chrome (unchanged)

`ui_speech_bubble`, `ui_window_notepad`, `ui_store_frame`, confetti and banner sheets stay 9-sliced inside the canvas/overlays — the redesign only changed the shell chrome around the canvas.

---

## Sidebar cards

### Stats card (`StatsCard`)

Four rows, one per vital — **Sức khỏe** (coral), **Tinh thần** (mint), **Năng lượng** (sky), **No bụng** (amber) — all rendered as clay stat pills (`StatBar variant="clay"`, both shells): 30px rounded pill, tinted track (`--stat-*-bg`), fill `--stat-*` with the light button-like clay edge, pixel icon + label **inside left**, current value **inside right** (on the fill). Low vital = soft opacity pulse on the fill + coral dot after the value. Testids `hud-health` / `hud-mood` / `hud-energy` / `hud-fullness` keep their data-attrs; Stat FX floaters/flash still ride each row. Energy max comes from `SIM_CATALOG.config.energy_max`, the rest `VITAL_MAX` (100).

### Actions card (`ActionsCard`)

A `flex-wrap` grid (3 per row, `hud-icon-bar`) of six tiles — **Ăn** (`HungerDock`), **Chơi game** (`GameButton`), **Đi ngủ** (`SleepButton`) as icon buttons with the name under them, then **Học / Việc làm / Kỹ năng** as `light` tiles (icon over label, `BUTTON_LIGHT.iconPx` icons). Tooltips and aria-labels are unchanged. The full-width amber **Cửa hàng** (`StoreButton wide`, `open-store`) closes the card.

### Profile card (`ProfileCard`)

Avatar, name + overall `RankBadge`, `{stage} · {rank}` (`player-rank`), presentational **Lv/XP** bar (level = sum of the five skill levels, progress = Σxp/ΣxpToNext — display only, no game state), trait row with tooltip (`player-trait`), sick/burnout lines, **Danh tiếng** (`player-reputation`, tweened + Stat FX), **Freelance n/100** bar (`player-freelance`), rent line (`life-rent`).

### Skills card (`SkillsCard`)

Native `<details>` collapsed by default; summary "Kỹ năng" with a rotating chevron. Rows: icon, name, rank badge, `rankLabel %`, mint stepped bar (`player-skills`, `player-skill-*`).

---

## 3D shell palette

GameShell always renders the R3F scene and adds **`.theme-clay`** to the shell root, passing `clay` to `ProfileCard` / `ActionsCard` (and the icon buttons they mount); `StatsCard` renders its clay stat pills in the sidebar block. The **material is the same global clay** — `.theme-clay` only swaps the palette: card `#FBF9FD` / ink `#3D3550` / muted `#7A7290`, page bg `#EFEAF6`, tab lavender `#E9E2F5`, softer red `#E2607A` for negative money, and the action-tile faces (`--btn-eat` … `--btn-store`). The pastel stat fills (`--stat-*`) live in `:root` and are shared.

- **StatBar `variant="clay"`** (also the stats card in the sidebar): 30px fully-rounded pill, tinted track (`--stat-*-bg`), fill `--stat-*` with the light clay edge, icon + label **inside** left, current value **inside** right (`hud-*` testids and data attrs unchanged). Low stat = soft opacity pulse on the fill + 8px coral dot by the number (the red `stat-blink` frame is not used here). Tone mapping: coral→health, mint→mood, sky→energy, amber→full, exp→xp. Height follows `--clay-stat-h` (the profile XP bar sets 10px).
- **ProfileCard clay**: 56px round avatar + name (800) + subtitle row; one XP line (`Lv. N · x/y XP`); trait/reputation/freelance/rent fold into `--clay-chip` pills (`player-trait`, `player-reputation`, `player-freelance`, `life-rent` testids kept).
- **Actions clay**: the six tiles share one family — the pastel face sits on the tile wrapper (`.clay-tile[data-clay-tone=eat|game|sleep|study|jobs|skills]`, radius `--radius-tile`, ctrl shadow stack), the inner `PixelButton` goes chromeless (`.clay-tile-inner`). 3-col grid, 10px gap, hover −1px lift, active `scale(.95)`. Ăn's ready dot recolors to `--stat-full`. Cửa hàng drops the amber bar for a full-width cream pill (`--btn-store`, 48px, ink `--clay-text`).
- **Top bar clay**: notifications/audio shrink to 40px round faces. Negative money keeps the softer red.

---

## Event popup

`LifeEventPopup` mounts inside the scene card over the canvas. Numbers live in `src/components/game/life-event-popup.config.ts` (`LIFE_EVENT_POPUP`): 424×186 card, 8px inset, `zIndex` 20, 160ms fade+rise, rose border `#E3B4D8`. The host takes no pointer events; only the card does.

---

## Tooltips

Chrome hints use `src/components/ui/tooltip.tsx` (`TOOLTIP` config unchanged: 300ms hover delay, 120ms skip, 8px offsets). Keyboard focus opens immediately; coarse pointers tap-to-open.

---

## Modal

Popup chrome uses `src/components/ui/modal.tsx` (`MODAL` config): overlay z-40, content z-50, 160ms fade+rise, backdrop **`rgba(42, 37, 72, 0.28)`** (softened for the light page; the career panel and level-up popups use the same tint), 80vh cap, 420px default / 640px store width. `PanelCard` content (white, 24px radius, clay shadow).

---

## Store grid

Unchanged mechanics (`STORE_GRID`): 2 columns mobile / 4 desktop, 148px cells, tabs **Nội thất / Phòng / Tất cả**, owned = mint border + **Đã có**, locked = dimmed + **Ghim**, buttons `PixelButton`. The store opens from the amber Cửa hàng bar on the actions card (`open-store`).

---

## Motion & a11y

Respect `prefers-reduced-motion` (see the reduced-motion block in `globals.css` — floats, blinks, slides, and the tooltip/entrance animations all switch off). Keep tap targets ≥ 44px on mobile where practical. `src/lib/reduced-motion.ts` provides `prefersReducedMotion()` / `usePrefersReducedMotion()`.

The rice-bowl Ăn icon still pulses on Hơi đói / Đói (timings in `food-dock.config.ts`); reduced motion holds a static tint.
