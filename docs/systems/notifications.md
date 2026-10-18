# Thông báo

Left column. Newest first. Empty copy stays “Chưa có thông báo.” **Đã đọc** still marks every stored row read, including a hunger row that this list does not draw. Clicking a row still marks that row read. An action still calls `runNoticeAction` and does nothing else.

Hunger rows stay out of this list and out of the unread disc. `advanceHunger` writes them with id `hunger-<day>-<meals>` and action `eat`. `LifeNotice` has no kind, type, or source, and the icon and severity are shared with other rows, so `isHungerNotice` (`src/components/game/hunger-notice.ts`) matches that action or that id. The panel filters with it at render time. The feed still stores the row. Đói shows on the rice-bowl button beside Đi ngủ on the HUD icon bar. The low Sức khỏe row stays listed and still counts: action `sleep`, id `sick-<day>`.

Numbers live in `src/components/game/notifications.config.ts`.

## Unread badge

`ui_badge_unread_lg` (`public/ui/m5_1/`, native 16×16 and `_x2` 32×32). `slices.json` records the native size. The header draws the native sheet at 1×, so the disc is **16 CSS px**. The count is Galmuri7 at 8px, white, centered. Above 9 the disc still shows 9. The disc eases its opacity to `NOTICE_BADGE_PULSE_OPACITY` (0.75) over `NOTICE_BADGE_PULSE_MS` (1600). `prefers-reduced-motion` leaves it fully opaque.

## Rows

| | Before | Now |
|---|--------|-----|
| Card padding | 12px | `NOTICE_LIST.paddingPx` (8) |
| Icon / copy gap | 10px | `NOTICE_LIST.gapPx` (8) |
| List gap | 8px | `NOTICE_LIST.listGapPx` (6) |
| Row icon | 32px | `NOTICE_LIST.rowIconPx` (16, the native notice icon) |
| Message | Galmuri9 at 20px | Galmuri7 at `NOTICE_LIST.textPx` (16) |
| Lines | open | `NOTICE_LIST.lines` (2). A short notice stays on one line |

The clock sits on the first line, in the muted color, inside the same clamp.

## Actions

When `actions` has entries, the row draws one `PixelButton` per entry, in that order, under the message. The variant is the entry's `primary` or `secondary`. A missing variant is `secondary`. The face is the shared 9-slice at 2× (48 CSS px tall, center 16 CSS px). A glyph is the native `icon_action_*` (16×16) with the label beside it in Galmuri7 at `NOTICE_ACTION_LABEL_PX` (16). A button with no glyph is still a `PixelButton` and shows only its label. The buttons sit in a wrapping row (`flex-wrap`) so a narrow panel stacks them, and the card keeps the 8px padding and the two-line clamp. `aria-label` and the tooltip are that same label. The tip is `src/components/ui/tooltip.tsx`.

The glyph is the entry's `icon` when that names a sheet. Otherwise the id map below is used. `openJobs` uses `icon_action_view_job`. `acceptJob` and `dismissNotice` have no glyph.

| Action | Label | Glyph |
|--------|-------|-------|
| `payRent` | Trả trọ | `icon_action_pay_rent` (money stack) |
| `viewJobs` | Xem job | `icon_action_view_job` (ticket) |
| `openStore` | Mở store | `icon_action_open_store` (bag). Still `runNoticeAction("openStore")`, which opens the store modal |
| `eat` | Ăn | `icon_action_eat` (rice bowl) |
| `sleep` | Ngủ | `icon_action_sleep` (bed) |
| `acceptJob` | Nhận | none. A job offer sets variant `primary` |
| `dismissNotice` | Bỏ qua | none. A job offer sets variant `secondary` |
| `openJobs` | Làm | `icon_action_view_job` (ticket) |

A click calls `runNoticeAction(button.id, notice)` and `stopPropagation`, so the row's mark-read click does not also run. The button does not mark the row read. `payRent` pays outstanding rent. `eat` opens the Ăn uống modal, the same shape as `openStore`. Hunger rows are still written to the feed; this list does not draw them. `sleep` calls the HUD sleep control and stays on the low Sức khỏe row. `acceptJob` accepts that row's job. `dismissNotice` closes that row. `openJobs` opens the job board and, when `payload.jobId` is an accepted job, the terminal. Any other id logs `Unknown notice action "…"` and does nothing.

When `actions` is absent or empty, the single `action` path stays. A known glyph is a secondary `PixelButton` with the label beside it. An id with no glyph is the outline text button. That click also calls `runNoticeAction(id, notice)` and does not mark the row read.

A notice may carry several buttons. The persisted shape after version 17 is:

```ts
type NoticeActionId =
  | "payRent" | "viewJobs" | "openStore" | "eat" | "sleep"
  | "acceptJob" | "dismissNotice" | "openJobs"

type Notice = {
  id: string
  day: number
  minute: number
  severity: "info" | "warn" | "urgent"
  icon: string
  text: string
  action: NoticeActionId | null // legacy single id, actions[0].id
  actions?: { id: NoticeActionId; label: string; icon?: string; variant?: "primary" | "secondary" }[]
  payload?: { jobId?: string }
  read: boolean
  cue: string | null
}

runNoticeAction(id: NoticeActionId, notice?: Notice): void
```

A job offer emits `actions` Nhận (`acceptJob`, primary) and Bỏ qua (`dismissNotice`, secondary), with `payload: { jobId }` and legacy `action: "acceptJob"`. A deadline reminder emits one button `{ id: "openJobs", label: "Làm", variant: "primary" }` and `payload: { jobId }`. The list draws one button per `actions` entry, including that Làm button, and passes the notice to `runNoticeAction`. While `actions` is non-empty it ignores the legacy `action` id. The list region is `overflow-y: auto` inside the desktop panel cap (see the layout section of [DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md)).
