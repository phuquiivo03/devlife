# devlife UI — PRIMARY design system (Galmuri / soft gradient)

**This is the PRIMARY design system for devlife.** All UI in this repository must follow it unless the owner explicitly names another style for a feature (for example, the in-game terminal uses [TERMINAL.md](./TERMINAL.md)).

---

## Philosophy

Cozy developer life-sim chrome: soft blue–violet–pink atmosphere, readable lavender cards, pixel art for world assets (room, icons, avatars). The **room canvas stays small** in the center column — never upscale it to fill the layout.

---

## Background

Prefer **CSS** for crisp scaling:

- Gradient: `linear-gradient(135deg, #3B3F8F 0%, #5A63C4 45%, #9A78CC 75%, #D08FCB 100%)`
- Grid: `1px` lines `rgba(255,255,255,0.06)` every **24px**, fixed attachment
- Radial glow behind the room stage (`.room-stage-glow`)
- Reference/fallback image: `public/reference/background.jpg`

Utility class: `devlife-page-bg` on `html`/`body` (gradient + grid in **one** `background-image` stack — do not split into two classes or the grid layer hides the gradient).

**No black letterbox void** — use violet frame + gradient in empty space.

---

## Layout (desktop)

On `lg` and up, the three columns are one centered group (`max-w-[1200px]`), not stretched to the viewport. Side columns are **320px**. The center column holds the capped room and the HUD and stays within **520px**. A **20px** gap separates the columns. Leftover width on both sides is only the page gradient. The columns are top-aligned. At 1366px the group still fits with those widths and the same gap. Below `lg`, the stack is unchanged.

On `lg`, both side panels are sticky and their block size is the viewport cap from `src/components/game/shell-layout.config.ts` (`SHELL_LAYOUT`). That cap is `100vh` minus the header and the scroll region's top and bottom margins, so the columns stay on screen while the center column scrolls. The panel interior scrolls (`overflow-y: auto`). This design system has no pixel scrollbar, so that scroller is the native one. Panel `z-index` stays below the holiday banner, modals, popups, and tooltips, so the banner can paint across the columns. Below `lg` the panels stay in normal flow and scroll with the page. The right panel's cards, type, and tabs are unchanged; only this size and the inner scroll apply.

| Key | Default | Meaning |
|-----|---------|---------|
| `desktopMinPx` | 1024 | Tailwind `lg`. Below this, no sticky cap |
| `headerPx` | 56 | Header `min-h-14`, border included |
| `marginYPx` | 24 | `lg:py-6`, subtracted twice. This padding is the inset |
| `stickyTopPx` | 0 | Sticky offset. Stays 0 so it does not stack on that padding |
| `panelZ` | 1 | Under the banner (`overlayFloorZ` 30) and modal/tooltip layers (40+) |

On `lg` the shell is `h-screen` and the region under the header is what scrolls. The header stays put. Below `lg` the page still scrolls as a whole.

| Column | Content |
|--------|---------|
| Left | Notifications (`Thông báo`) |
| Center | Room status bar (Tiền, Ngày/giờ, Cửa hàng), small framed room, stage pill label, HUD card |
| Right | Tabs `Nhân vật` / `Sửa phòng` |

**Mobile:** stack **room → HUD → panels** (notifications, then character/customize). The status bar stays directly above the room and wraps if the row does not fit; Cửa hàng stays at the trailing edge.

### Room status bar

A lavender card sits in the center column, directly above the room frame, and scrolls with that column. It does not change the sticky side panels. Its cap is `CENTER_COLUMN_MAX_PX` (520), the same cap as the HUD card, from `src/components/game/shell-layout.config.ts` (`ROOM_STATUS_BAR`). That width keeps Tiền, Ngày/giờ, and Cửa hàng on one line in the desktop column. The room slot stays at `ROOM_VIEWPORT_W` (480) and stays centered under the bar. Below `lg`, and whenever the column is narrower than the row, the bar is `width: 100%` up to that cap and wraps; Cửa hàng stays at the trailing edge.

| Key | Default | Meaning |
|-----|---------|---------|
| `maxWidthPx` | 520 | Center-column cap, shared with the HUD card |
| `gapBelowPx` | 8 | Space between the bar and the room frame |
| `padXPx` | 12 | Horizontal padding |
| `padYPx` | 6 | Vertical padding |
| `clusterGapPx` | 16 | Space between Tiền and Ngày/giờ |
| `iconGapPx` | 6 | Space between an icon and its text |
| `wrapGapPx` | 8 | Row gap when the bar wraps |
| `iconPx` | 22 | Savings icon and the phase icon |
| `separator` | ` · ` | Between day, weekday, and clock |

Left to right: the savings icon and the VND amount (`hud-money`), the phase icon and `Ngày N · weekday · HH:MM phase` (`game-clock`, for example `Ngày 1 · T2 · 08:12 Sáng`), then **Cửa hàng** (`icon_btn_store`, tooltip “Cửa hàng”) pinned to the end. Fast-forward still flashes the clock cluster. Galmuri7 at 16px, so Tiền and Ngày/giờ share one line with the shop button in the desktop column.

---

## Color tokens

| Token | Value | Use |
|-------|-------|-----|
| panel bg | `#F3F1F8` | Cards |
| panel border | `#D9D4E6` | 1px borders |
| foreground | `#2A2548` | Text |
| muted foreground | `#5C5678` | Secondary text |
| coral | `#F0625F` | Health, Frontend bars |
| mint | `#5CCB9A` | Mood, Backend, EXP |
| sky | `#4A90E2` | Energy, Thuật toán |
| tab lavender | `#E8E2F4` | Inactive tabs |
| stage plate | `#E9E4F5` / `#3B3466` | Chamfered room label text/bg |

Shadow: `0 8px 24px rgba(30, 20, 80, 0.25)` (`shadow-panel` / `--shadow-panel`).

Radius: **12px** on cards (`--radius-panel`).

---

## Typography — Galmuri (OFL)

Self-hosted under `src/app/fonts/` (see `LICENSE.txt` in `public/fonts/`). **Do not use Galmuri11-Bold** (missing Vietnamese glyphs).

| Role | Face | Design size | Desktop UI (integer multiple) |
|------|------|-------------|-------------------------------|
| Body | Galmuri9 | 10px | 20px (`--text-galmuri-body`) |
| Titles | Galmuri11 | 12px | 24px (`--text-galmuri-title`) |
| Small | Galmuri7 | 8px | 16px (`--text-galmuri-small`) |

**Rule:** render at **integer px sizes** only (multiples of the design sizes for readability).

Classes: `font-galmuri-7`, `font-galmuri-9`, `font-galmuri-11`, `text-galmuri-*`.

User-facing copy: **Vietnamese**; tech terms stay English (Frontend, Backend, Junior, …).

---

## Pixel buttons

New chrome uses `PixelButton` from `@/components/ui/button` (`primary`, `secondary`, `light`, `danger`, and square `icon`). Skins are the `ui_btn_*` 9-slices in `public/ui/m5_1/` (`normal` / `hover` / `pressed`, native and `_x2`). Insets come from `slices.json`. The pressed face is already 2 native pixels lower; the label drops that same distance with the face. `light` is the notice **Ăn** / **Xem job** face: the secondary sheet, light fill `#E8E2F4`, dark pixel border `#1E1428`, dark ink `#2A2548`, Galmuri7 at 16px. Those numbers are `BUTTON_LIGHT` and `--btn-light-*`. An icon sits on the left of the label. **Học**, **Việc làm**, **Kỹ năng**, **Đã đọc**, life-event choices, and the job board **Làm** use it. The older `Button` styles stay as they are. Details: [buttons.md](../systems/buttons.md).

---

## Pixel art

Room canvas, UI icons, avatars: `image-rendering: pixelated` (`.pixelated`). Do not blur or round canvas pixels.

### Icons (`public/ui/icons/`)

Art-agent PNGs with clean alpha (no chroma-key). Naming: `icon_<name>.png` and `icon_<name>_x4.png`.

| Asset | Native size | ×4 size |
|-------|-------------|---------|
| Icons | **44×44** | **176×176** |

**IDs (23):** `health`, `mood`, `energy`, `burnout`, `clock`, `level`, `job`, `reputation`, `stars`, `relationship`, `frontend`, `backend`, `devops`, `algorithms`, `english`, `communication`, `balance`, `salary`, `rent`, `food`, `savings`, `debt`, `skill_up`.

**HUD menu:** `skills` is `icon_skills.png` only (44×44, no `_x4`). The Kỹ năng button picks it through `SKILL_MENU_ICON`. Học uses `icon_learn_book`. Việc làm uses the briefcase `icon_job`. All three sit on the left of a `light` button.

**Phase clock:** `morning`, `noon`, `evening`, `night` (same `icon_<key>.png` / `_x4` files). The HUD uses them next to the in-game clock and falls back to an emoji only when a file is missing.

Use `PixelIcon` + `resolveIconAsset()` in `src/lib/pixel-assets.ts`: pick native or `_x4` so CSS display size is an **integer downscale/upscale** only (e.g. 22px display → 44px native @ 2×, 88px display → 176px `_x4` @ 2×).

### Avatars (`public/ui/avatars/`)

Framed portraits for in-game chrome (use **framed**, not `_bust`, unless a scene explicitly needs bust crop).

| Asset | Native | ×4 |
|-------|--------|-----|
| Framed avatar | **48×48** | **192×192** |

**Roles:** `player`, `boss`, `tech_lead`, `coworker_male`, `designer`, `partner`, `hr`.  
Also shipped: `avatar_<role>_bust.png` (+ `_x4`) for future dialogue UI.

Use `PixelAvatar` + `resolveAvatarAsset()` with the same integer-scale rule.

---

## HUD & stat bars

- HUD card under the room has **no avatar**. Three labeled bars, each with `current/max`: **Sức khỏe** (coral), **Tinh thần** (mint), **Năng lượng** (sky). The numbers are rounded; the saved values are floats. Energy, health, mood, money, and the clock are the career/life state. The name on the character card stays the placeholder.
- Same card: the icon bar is trailing-aligned and holds two icon-only `PixelButton`s of the same size. **Ăn** (rice bowl `icon_btn_food`) sits immediately before **Đi ngủ** (bed `icon_btn_sleep`). Sleep stays on the trailing edge. Money and the clock are only on the room status bar above the canvas. Tips use `src/components/ui/tooltip.tsx`: sleep is “Đi ngủ”, and the bowl is “Ăn · ” plus the hunger level. Each button keeps that string as its `aria-label`. While sleep is allowed, `fx_zzz` floats above the bed; `prefers-reduced-motion` keeps the first frame still. Timings are in `src/components/game/sleep-button.config.ts`, `src/components/game/store-button.config.ts`, and `src/components/game/food-dock.config.ts`. On a narrow screen the pair wraps and stays end-aligned. Then **Học** / **Việc làm** / **Kỹ năng**, each a `PixelButton` `light` with its icon on the left (`icon_learn_book`, `icon_job`, `icon_skills` via `SKILL_MENU_ICON`). Below a 28rem card they stack; from there they share one row.
- Audio row on that card: mute button (**Tắt tiếng** / **Bật tiếng**) and two sliders, **Nhạc** and **Hiệu ứng**. Mute uses `icon_sound_on` / `icon_sound_off` (44×44 native only, shown at 22px, `image-rendering: pixelated`). Each slider puts `icon_volume_low` and `icon_volume_high` at its ends the same way. Defaults live in `game_config.json`: sound on, Nhạc 0.5, Hiệu ứng 0.8. The choice is stored in `localStorage` (`devlife:audio:v2`), separate from the career save. A `devlife:audio:v1` payload is unmuted once and rewritten as v2; a later mute stays muted. SFX play from one preloaded Web Audio sprite. Music starts after the first tap or key, during idle, so it does not block the first paint. On iOS the context uses the media playback channel, so the ring/silent switch does not mute the game; if the sprite cannot be decoded, SFX fall back to per-file audio.
- **Học** panel has two tabs: **Khóa học** (courses still available to buy) and **Đã học** (finished courses, read-only: skill, XP granted, day completed). Empty states: “Không còn khóa để học.” and “Chưa học khóa nào.” A non-repeatable course moves to **Đã học** after one purchase.
- **Nhân vật** panel: avatar, name, stage, overall rank badge (rounded mean of the five skill levels), trait row (icon at 22px and the trait name; the bonus line is a tooltip), **Danh tiếng**, Freelance `n/100` with a bar, then the five catalog skills from `skillProgressList` (icon, name, rank badge, `Junior 60%`, bar). No stub skill percents. The trait icon uses the same 22px box as Danh tiếng and Freelance.
- Bars: 1px border, fill coral / mint / sky per vital. A vital under its warning line blinks a coral inset; a change floats above that bar. `prefers-reduced-motion` keeps the inset and drops the blink.
- A pending life event (Mẹ gọi, Cúp điện, and the rest) is a card on the lower part of the room canvas. There is no dimmed backdrop: the room, HUD, and panels stay visible and keep clicks. The card is 424×186 CSS pixels and scales down, keeping that ratio, when the canvas is narrower or shorter. It fades and rises; `prefers-reduced-motion` skips the motion. Numbers are `LIFE_EVENT_POPUP` in `src/components/game/life-event-popup.config.ts`. The speech bubble still sits on the native M5 frame (`ui_speech_bubble`) as a 9-slice at 2×. The sleep diary is a notepad window on `ui_window_notepad` (`public/ui/m5_1/`, native and `_x2`, 9-slice from `slices.json`). The title is drawn in the titlebar. The window buttons are part of that frame. The store opens from the room status bar shop icon in the shared modal as a grid of smaller cells (see Store grid). Portraits and emotes use the native PNG at integer scale with `image-rendering: pixelated`. The room canvas is unchanged.

---

## Room viewport

`ROOM_VIEWPORT_W` in `shell-layout.config.ts` (read by `GameShell`, 480px) caps CSS size; renderer still uses integer device-pixel scale internally. **Do not increase** to fill the center column without owner approval. The room status bar uses the center-column cap (`CENTER_COLUMN_MAX_PX`, 520) so its row fits above that room.

### Chamfered game frame

Octagonal **clip-path** frame around the room (`RoomChamferFrame`), reference `uploads/index.html`. Nested layers (outer → inner), corners cut by `--c` per layer; scale corner radius and padding with `roomWidth / 427`:

| Layer | Corner `c` | Pad | Fill |
|-------|------------|-----|------|
| f1 | 16px | 3px | `#1C1745` outer line |
| f2 | 14px | 3px | gradient `#A99CF0` → `#7E70D0` bevel |
| f3 | 12px | 7px | gradient 160deg `#4A3F8C`, `#2D2763` 60%, `#3A2F78` body |
| f5 | 6px | — | canvas clip, flush on f3, + **inset** shadow `0 4px 10px rgba(0,0,0,.5)` (scaled) |

There is **no f4 / `#15112F` inner line** and no padding between the purple body and the canvas. The canvas slot (`.room-canvas-slot`) is transparent and shrink-wraps the canvas, so the purple frame meets the canvas edge. No dark letterbox behind the canvas.

**Glow:** `.room-frame-glow` wrapper uses `filter: drop-shadow(...)` (not `box-shadow` — clip-path clips box-shadow).  
**Label plate:** chamfer `c6`, bg `#E9E4F5`, text `#3B3466`, stage title from room content.

**Side panels** use the same layers, pads, corners, and inset shadow at scale 1 (`PanelChamferFrame`), in a softer rose-lavender so the deep purple canvas stays the focus. Both columns share one color: f1 `#6A4A66`, f2 `#F8E4F2` → `#E3B4D8`, f3 `#E7C6E2` / `#D08FCB` (page-gradient pink) / `#E4B7D8`. The well is `--panel-bg` (`#F3F1F8`). Glow is `.panel-frame-glow`, lighter than the room. Inner notification and skill cards stay lavender `PanelCard`s.

**Thông báo** rows are compact: 8px padding, Galmuri7 at 16px, and the message clamps to two lines (the clock shares the first line). The header unread count is `ui_badge_unread_lg` at 16px, with an 8px white digit and a light opacity pulse (`prefers-reduced-motion` holds the disc still). Pay rent, view job, and open store are `PixelButton` `icon` actions (`icon_action_pay_rent`, `icon_action_view_job`, `icon_action_open_store`) with the old label as the tooltip and `aria-label`. Open store still runs the notice action that opens the store modal. Eat and sleep glyphs are in the same map. A label with no glyph stays a text button. Sizes: `src/components/game/notifications.config.ts` and [notifications.md](../systems/notifications.md).

Canvas sizing `ref` stays on the room-size cap box; the visible frame wraps the canvas inside it. Pointer hit-testing and `?debug=1` unchanged.

---

## Canvas exception

The **Canvas2D room renderer** is not restyled (integer scale, nearest-neighbour, no CSS shadows on canvas pixels). Debug route `/debug` unchanged.

---

## Event popup

The choice card is `LifeEventPopup`, mounted inside the room frame in `GameShell`. Numbers live in `src/components/game/life-event-popup.config.ts` (`LIFE_EVENT_POPUP`):

| Key | Default | Meaning |
|-----|---------|---------|
| `widthPx` | 424 | Card width on the desktop canvas |
| `heightPx` | 186 | Card height. Narrow canvases keep `width / height` |
| `insetPx` | 8 | Gap under the card. It stays centered at `widthPx` when the canvas is wider |
| `zIndex` | 20 | Above the canvas and the side panels (`panelZ` 1). Below the holiday banner (`overlayFloorZ` 30), modal backdrops, and tooltips (40) |
| `enterMs` | 160 | Fade and rise. `prefers-reduced-motion` skips it |
| `risePx` | 4 | How far the card rises while it fades in |
| `border` | `#E3B4D8` | Rose edge, same family as the side-panel frame |

The host does not take pointer events. Only the card does, so the rest of the room stays clickable. Copy, portraits, and choices are the event's own.

---

## Tooltips

Chrome hints use `src/components/ui/tooltip.tsx`. Numbers live in `src/components/ui/tooltip.config.ts` (`TOOLTIP`):

| Key | Default | Meaning |
|-----|---------|---------|
| `openDelayMs` | 300 | Hover delay on a fine pointer |
| `skipDelayMs` | 120 | How long the next tip in the same provider skips that delay |
| `sideOffsetPx` | 8 | Gap between the trigger and the tip |
| `collisionPaddingPx` | 8 | Viewport inset before the tip flips |
| `enterMs` | 120 | Fade and 4px slide. `prefers-reduced-motion` skips it |
| `disableHoverableContent` | true | Leaving the trigger closes the tip. The tip has no controls |

Hover opens the tip after `openDelayMs`. Keyboard focus opens it immediately and sets `aria-describedby` on the trigger while the tip is open. A coarse pointer opens it on tap; a tap outside, or Escape, closes it. The character-card trait row uses this for the bonus line. The room status bar shop icon and the HUD sleep icon use it for “Cửa hàng” and “Đi ngủ”. The HUD Ăn icon, beside Đi ngủ, uses it for “Ăn · ” plus the hunger level (“No”, “Hơi đói”, “Đói”), and that same string is the button `aria-label`. Notice actions show those words on the button and use the same string for `aria-label` and the tip: “Trả trọ”, “Xem job”, “Mở store”, “Ăn”, and “Ngủ”.

## Modal

Popup chrome uses `src/components/ui/modal.tsx`. Numbers live in `src/components/ui/modal.config.ts` (`MODAL`):

| Key | Default | Meaning |
|-----|---------|---------|
| `overlayZ` | 40 | Backdrop. Same stack as the career panel, the food popup, and the sheet overlay |
| `contentZ` | 50 | Dialog. Same stack as sheet content and the level-up popup |
| `enterMs` | 160 | Fade and rise. `prefers-reduced-motion` skips it |
| `risePx` | 4 | How far the dialog rises while it fades in |
| `backdrop` | `rgba(42, 37, 72, 0.45)` | Dim, same tint as the other full-screen overlays |
| `maxHeightVh` | 80 | Dialog cap |
| `chromePx` | 112 | Title row and padding kept outside the scrolling body |
| `maxWidthPx` | 420 | Default width cap. The store passes `STORE_GRID.modalMaxPx` (640) |
| `viewportInsetPx` | 16 | Side inset on a narrow viewport |

The shell traps focus, closes on Escape and a backdrop click, and sets `aria-modal`. **Đóng** closes it too. The store renders its grid inside it.

## Store grid

The shop dialog is a grid of item cells. Counts live in `src/components/game/store-grid.config.ts` (`STORE_GRID`). `storeGridCss()` writes the column rules, so the stylesheet does not keep a second copy.

| Key | Default | Meaning |
|-----|---------|---------|
| `columnsMobile` | 2 | Columns below `desktopMinPx` |
| `columnsDesktop` | 4 | Columns from `desktopMinPx` up |
| `desktopMinPx` | 1024 | Tailwind `lg`. Same cutoff as the shell |
| `gapPx` | 8 | Space between cells |
| `cellPx` | 148 | Desktop cell width the dialog is sized for. Narrower than the old 192px card |
| `modalPadPx` | 24 | Panel padding on both sides (modal `p-3`) |
| `modalMaxPx` | 640 | `cellPx * columnsDesktop + gapPx * (columnsDesktop - 1) + modalPadPx` |
| `furnitureIconPx` | 64 | Furniture art at 2× (native 32) |
| `roomIconW` / `roomIconH` | 64 / 40 | Room art at 1× |
| `badgePx` | 22 | Owned check and lock. Integer half of the 44px icon |

Tabs are **Nội thất**, **Phòng**, and **Tất cả**. The list is a `tablist` (arrow keys move the selection). The catalog has no category field, so `src/components/game/store-shelf.ts` treats a row with a stage, or a `room_` id, as a room and everything else as furniture. **Tất cả** draws furniture first, then rooms. An owned cell has a mint border, the done icon, and its button reads **Đã có**. A locked cell (skill, reputation, or room requirement) is dimmed, shows the lock icon, and its button is **Ghim**. Short on money, **Mua** stays disabled and **Ghim** stays so the item can still be pinned. Prices, buy, and pin still use the existing shop actions. Buttons are `PixelButton`.

## Motion & a11y

Respect `prefers-reduced-motion`. Keep tap targets ≥ 44px on mobile where practical.

The rice-bowl icon inside the HUD Ăn button pulses with opacity and brightness when the player is Hơi đói (slow, faint) or Đói (faster, stronger). No stays still. Reduced motion holds a static tint instead of the pulse. Timings are `HUNGER_BOWL_BLINK` in `src/components/game/food-dock.config.ts`.
