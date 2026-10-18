# Pixel buttons

Shared control for new chrome. Import `PixelButton` from `@/components/ui/button`. The existing `Button` (soft lavender / violet) is unchanged.

```tsx
import { PixelButton } from "@/components/ui/button";

<PixelButton variant="primary">Bắt đầu</PixelButton>
<PixelButton variant="secondary">Để sau</PixelButton>
<PixelButton variant="light">Học</PixelButton>
<PixelButton variant="danger">Bỏ</PixelButton>
<PixelButton variant="icon" aria-label="Sức khỏe">{icon}</PixelButton>
```

## Skins

Art lives in `public/ui/m5_1/`, with the other M5.1 frames (`m51AssetPath`).

| | |
|---|---|
| Keys | `ui_btn_primary`, `ui_btn_secondary`, `ui_btn_danger`, `ui_btn_icon`. `light` uses the secondary sheets |
| States | `normal`, `hover`, `pressed` |
| Files | `ui_btn_<variant>_<state>.png` (24×24) and `ui_btn_<variant>_<state>_x2.png` (48×48) |

`public/ui/m5_1/slices.json` → `ui_btn_*` is the 9-slice: native size 24, inset 8. The component draws at 2× and uses the `_x2` sheet, so the 8px inset is 16 CSS pixels and each art pixel stays one CSS pixel. Corners stay put; the center stretches.

Hover swaps to the hover sheet (brighter face). Press swaps to the pressed sheet.

## Light

`variant="light"` is the notice **Ăn** / **Xem job** face: the secondary 9-slice, a light fill, a dark pixel border, and dark text. An icon, when the control has one, is the first child of the label, so it sits on the left and drops with the face on press.

The numbers live in `BUTTON_LIGHT` (`src/components/ui/button/config.ts`) and the same values are `--btn-light-bg`, `--btn-light-border`, `--btn-light-ink`, `--btn-light-label`, and `--btn-light-weight` in `src/app/globals.css`.

| Token | Value | Meaning |
|---|---|---|
| background | `#E8E2F4` | Face of `ui_btn_secondary` (tab lavender) |
| border | `#1E1428` | Dark pixel edge of that sheet |
| ink | `#2A2548` | Label. Same as the foreground |
| weight | 400 | Regular Galmuri. Galmuri11-Bold has no Vietnamese glyphs |
| label | 16px | Galmuri7, same size as the notice action label |
| icon | 22px | Integer half of a 44px HUD icon |

**Học**, **Việc làm**, and **Kỹ năng** use this variant. The icons are the existing `icon_learn_book` (open book), `icon_job` (briefcase), and `icon_skills` (`SKILL_MENU_ICON`). **Đã đọc**, each life-event choice, and the job board **Làm** use it too. Notice rows stay on `secondary`, which shares this face and this ink.

## Press

The pressed sheet already draws the face 2 native pixels lower (`slices.json` note). The label and icon, which sit in the button, move by that same distance: 2 × the draw scale (4 CSS px at 2×). The button box does not move, so the face is not shifted twice. There is no extra offset on the text beyond the face shift.

Numbers that are not in the slice file (draw scale, padding, gap, focus ring, ink) live in `src/components/ui/button/config.ts`.

## Try it

Open `/debug/buttons`. Hold a button: the face art and the label drop together, then release back. Disabled buttons do not drop. Icon buttons are square.

## Sleep

The HUD **Đi ngủ** control is `SleepButton` (`src/components/game/SleepButton.tsx`): `PixelButton` variant `icon`, no text. The face is `icon_btn_sleep` (`icon_btn_sleep.png` 24×24, `icon_btn_sleep_x2.png` 48×48) drawn at 2× in the 9-slice center, so the button box is the icon plus the two slice borders.

`fx_zzz` plays above the top-right of that bed while sleep is allowed (Tối and Đêm). The sheet is `fx_zzz.png` (36×12) and `fx_zzz_x2.png` (72×24).

| | |
|---|---|
| Source | `public/ui/m5_1/anim.json` → `fx_zzz` |
| Frames | 12×12, 3 frames, horizontal |
| Loop | 900ms, looping |
| Motion | drift up `ZZZ_DRIFT_NATIVE_PX` (8 native px) and fade out |
| Anchor | `ZZZ_ANCHOR_NATIVE`: 5 native px past the bed's right, 7 native px above its top |
| Still | `prefers-reduced-motion`: first frame, no drift |

Those numbers are read in `src/components/game/sleep-button.config.ts`. The drift and the anchor are the only distances the art file does not give.

The tooltip is `src/components/ui/tooltip.tsx` with the text “Đi ngủ”. The button keeps `aria-label` “Đi ngủ”. A span around the button is the tooltip trigger, so the tip still opens when the control is disabled. Clicking still calls the same `sleep` action.

## Store

The HUD **Cửa hàng** control is `StoreButton` (`src/components/game/StoreButton.tsx`): `PixelButton` variant `icon`, no text. The face is `icon_btn_store` (`icon_btn_store.png` 24×24, `icon_btn_store_x2.png` 48×48) drawn at 2× in the 9-slice center, so the button box is the icon plus the two slice borders. The outer size is read in `src/components/game/store-button.config.ts`.

It sits at the trailing end of the room status bar, above the canvas, after Tiền and Ngày/giờ. **Đi ngủ** stays on the HUD icon bar, with **Ăn** immediately before it. The gap on that bar is `HUD_ICON_GAP_PX` (8). The tooltip is the shared tooltip with the text “Cửa hàng”, and the button keeps that `aria-label`. Bar spacing is `ROOM_STATUS_BAR` in `src/components/game/shell-layout.config.ts`.

The list opens in the shared modal (`src/components/ui/modal.tsx`) as a grid. Column counts are `STORE_GRID` in `src/components/game/store-grid.config.ts`: 4 from 1024px, 2 below that. Tabs **Nội thất**, **Phòng**, and **Tất cả** filter the catalog. Cells use `PixelButton`. An owned item has a mint border and the button **Đã có**. A locked item is dimmed, shows the lock icon, and keeps **Ghim**. Prices and the buy/pin actions are unchanged. Closing is Escape, a backdrop click, or **Đóng**. The notice action “Mở store” still sets `storeOpen`. The Thông báo panel no longer embeds the list.

## Meals

The HUD **Ăn** control is `HungerDock` in `src/components/game/FoodPopup.tsx`. It is mounted on the HUD icon bar in `PlayerHudCard`, immediately before **Đi ngủ**. Sleep stays at the trailing edge of that bar. Both are `PixelButton` variant `icon` with the same outer size: `foodButtonMetrics` matches `sleepButtonMetrics` (the 24px native icon at 2× in the 9-slice center, plus the two slice borders). The face is `icon_btn_food` drawn at 2× (`foodArtFile`). The level is the tooltip, so the bar does not draw a word beside the bowl. There is no hunger badge on the bowl.

The shared tooltip is `src/components/ui/tooltip.tsx`. The text is `foodHungerTip`: “Ăn · ” plus the level from `hungerLabel` (“No”, “Hơi đói”, “Đói”), for example “Ăn · Hơi đói”. The button `aria-label` uses that same string. A click still opens the Ăn uống list. On a narrow screen the icon bar wraps and both buttons stay end-aligned.

The bowl icon pulses with opacity and brightness. It does not move. Numbers are `HUNGER_BOWL_BLINK` in `src/components/game/food-dock.config.ts`. The CSS module is `src/components/game/food-dock.module.css`.

| Level | Motion |
|---|---|
| No | Still. No animation, no tint. |
| Hơi đói | 2200ms. Opacity eases down to 0.78, brightness to 0.94. |
| Đói | 700ms. Opacity eases down to 0.45, brightness to 0.7. |

`prefers-reduced-motion` skips the pulse and holds a static tint: Hơi đói at opacity 0.9 and brightness 0.96, Đói at opacity 0.62 and brightness 0.78.

## Notice actions

Pay rent, view job, open store, eat, and sleep in the notice list use `PixelButton` variant `secondary`. The glyph (`icon_action_*`, 16×16 native) sits in the 16px center beside a Galmuri7 label: “Trả trọ”, “Xem job”, “Mở store”, “Ăn”, “Ngủ”. `aria-label` and the tooltip repeat that label. Sizes and the text-button fallback are in `src/components/game/notifications.config.ts`.
