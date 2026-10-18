import sliceDoc from "../../../public/ui/m5_1/slices.json";
import { BUTTON_UI_SCALE, buttonMetrics, type ButtonScale } from "@/components/ui/button/config";
import type { NoticeAction, NoticeActionButton, NoticeActionId } from "@/game/career/types";

/**
 * Thông báo panel metrics. The badge size comes from
 * `public/ui/m5_1/slices.json` (`ui_badge_unread_lg`). Distances the art
 * file does not spell out live here and in `docs/systems/notifications.md`.
 */

type BadgeSlice = {
  size: [number, number];
  note: string;
};

const badgeSlice = sliceDoc.ui_badge_unread_lg as BadgeSlice;

if (!badgeSlice || badgeSlice.size[0] !== 16 || badgeSlice.size[1] !== 16) {
  throw new Error("public/ui/m5_1/slices.json ui_badge_unread_lg must be 16×16");
}

export const NOTICE_BADGE_KEY = "ui_badge_unread_lg";

/** Native pixels. The panel draws this sheet at 1×, so the disc is 16 CSS px. */
export const NOTICE_BADGE_NATIVE_PX = badgeSlice.size[0];

/**
 * 1× keeps the count badge at the spec size (~16 CSS px).
 * The `_x2` sheet is shipped beside it and is not used at this size.
 */
export const NOTICE_BADGE_SCALE = 1 as const;

/** Galmuri7 at 1×. This is the integer size that fits inside the 16px disc. */
export const NOTICE_BADGE_COUNT_PX = 8;

/** Digits drawn in the disc. A larger unread count still shows this cap. */
export const NOTICE_BADGE_COUNT_CAP = 9;

/** Opacity pulse on the unread disc. `prefers-reduced-motion` holds it still. */
export const NOTICE_BADGE_PULSE_MS = 1600;

/** Lowest opacity of that pulse. 1 is fully the red disc. */
export const NOTICE_BADGE_PULSE_OPACITY = 0.75;

/** Native size of every `icon_action_*` glyph. */
export const NOTICE_ACTION_ICON_NATIVE_PX = 16;

/**
 * Compact row. Padding was 12px, the row icon was drawn at 32px, and the
 * message was Galmuri9 at 20px. Copy now uses Galmuri7 at 16px and clamps
 * to two lines (a short line stays on one).
 */
export const NOTICE_LIST = {
  paddingPx: 8,
  gapPx: 8,
  listGapPx: 6,
  rowIconPx: 16,
  textPx: 16,
  linePx: 16,
  lines: 2,
} as const;

/**
 * Short labels drawn next to the glyph. `eat` and `sleep` are included so a
 * notice with that action id renders here. The store handler still branches
 * the three schema actions; the button passes the id through either way.
 */
export const NOTICE_ACTION_LABELS = {
  payRent: "Trả trọ",
  viewJobs: "Xem job",
  openStore: "Mở store",
  eat: "Ăn",
  sleep: "Ngủ",
} as const satisfies Record<NoticeAction | "eat" | "sleep", string>;

/**
 * Spec glyphs. A labeled action with no entry falls back to the text button.
 */
export const NOTICE_ACTION_ICONS = {
  payRent: "icon_action_pay_rent",
  viewJobs: "icon_action_view_job",
  openStore: "icon_action_open_store",
  eat: "icon_action_eat",
  sleep: "icon_action_sleep",
} as const satisfies Record<keyof typeof NOTICE_ACTION_LABELS, string>;

export type NoticeActionIconKey = (typeof NOTICE_ACTION_ICONS)[keyof typeof NOTICE_ACTION_ICONS];

const NOTICE_ACTION_ICON_KEY_SET = new Set<string>(Object.values(NOTICE_ACTION_ICONS));

/**
 * Ids that share an existing `icon_action_*` sheet. `openJobs` uses the
 * job ticket. `acceptJob` and `dismissNotice` have no glyph.
 */
export const NOTICE_ACTION_ID_ICONS: Partial<Record<NoticeActionId, NoticeActionIconKey>> = {
  payRent: NOTICE_ACTION_ICONS.payRent,
  viewJobs: NOTICE_ACTION_ICONS.viewJobs,
  openStore: NOTICE_ACTION_ICONS.openStore,
  eat: NOTICE_ACTION_ICONS.eat,
  sleep: NOTICE_ACTION_ICONS.sleep,
  openJobs: NOTICE_ACTION_ICONS.viewJobs,
};

export type NoticeButtonGlyph = {
  iconKey: string;
  file: string;
};

export type NoticeActionControl =
  | { kind: "icon"; label: string; iconKey: NoticeActionIconKey }
  | { kind: "text"; label: string };

export function noticeBadgeFile(scale: 1 | 2 = NOTICE_BADGE_SCALE): string {
  return scale === 2 ? `${NOTICE_BADGE_KEY}_x2.png` : `${NOTICE_BADGE_KEY}.png`;
}

export function noticeBadgeMetrics(scale: 1 | 2 = NOTICE_BADGE_SCALE) {
  const sizePx = NOTICE_BADGE_NATIVE_PX * scale;
  return {
    scale,
    sizePx,
    countPx: NOTICE_BADGE_COUNT_PX * scale,
  };
}

export function actionIconFile(key: NoticeActionIconKey, scale: 1 | 2 = 1): string {
  return scale === 2 ? `${key}_x2.png` : `${key}.png`;
}

/** Galmuri7. Fits the 16px center of the shared 2× button and stays on one line. */
export const NOTICE_ACTION_LABEL_PX = 16;

/**
 * Labeled action. The face is the shared secondary 9-slice at 2× (48 CSS px
 * tall, center 16 CSS px). The glyph is the native `icon_action_*` sheet,
 * which fills that center, and the label sits beside it.
 */
export function noticeActionButtonMetrics(scale: ButtonScale = BUTTON_UI_SCALE) {
  const frame = buttonMetrics(scale);
  const centerPx = frame.iconPx - frame.slicePx * 2;
  return {
    scale,
    minHeightPx: frame.minHeightPx,
    centerPx,
    glyphPx: NOTICE_ACTION_ICON_NATIVE_PX,
    labelPx: NOTICE_ACTION_LABEL_PX,
  };
}

/** `primary` stays primary. Every other value, including a missing one, is `secondary`. */
export function noticeButtonVariant(
  variant: NoticeActionButton["variant"],
): "primary" | "secondary" {
  return variant === "primary" ? "primary" : "secondary";
}

/**
 * Glyph for one `actions` entry. An explicit `icon` wins. Otherwise the id
 * map is used, and an id with no sheet returns null.
 */
export function noticeButtonGlyph(button: NoticeActionButton): NoticeButtonGlyph | null {
  const explicit = button.icon?.trim();
  if (explicit) {
    const iconKey = explicit.replace(/\.png$/i, "");
    if (NOTICE_ACTION_ICON_KEY_SET.has(iconKey)) {
      return { iconKey, file: actionIconFile(iconKey as NoticeActionIconKey) };
    }
    return { iconKey, file: explicit.toLowerCase().endsWith(".png") ? explicit : `${explicit}.png` };
  }
  const mapped = NOTICE_ACTION_ID_ICONS[button.id];
  if (!mapped) return null;
  return { iconKey: mapped, file: actionIconFile(mapped) };
}

/** Ordered buttons. Null when `actions` is absent or empty, so the single `action` path stays. */
export function listedNoticeActions(
  notice: { actions?: readonly NoticeActionButton[] | null },
): readonly NoticeActionButton[] | null {
  const actions = notice.actions;
  if (!actions || actions.length === 0) return null;
  return actions;
}

export function resolveNoticeAction(
  action: string,
  icons: Readonly<Partial<Record<string, NoticeActionIconKey>>> = NOTICE_ACTION_ICONS,
): NoticeActionControl | null {
  const label = NOTICE_ACTION_LABELS[action as keyof typeof NOTICE_ACTION_LABELS];
  if (!label) return null;
  const iconKey = icons[action];
  if (!iconKey) return { kind: "text", label };
  return { kind: "icon", label, iconKey };
}

/** Custom properties for the list, the rows, and the unread disc. */
export function noticeChromeStyle(): Record<`--${string}`, string> {
  const badge = noticeBadgeMetrics();
  return {
    "--notice-pad": `${NOTICE_LIST.paddingPx}px`,
    "--notice-gap": `${NOTICE_LIST.gapPx}px`,
    "--notice-list-gap": `${NOTICE_LIST.listGapPx}px`,
    "--notice-icon": `${NOTICE_LIST.rowIconPx}px`,
    "--notice-text": `${NOTICE_LIST.textPx}px`,
    "--notice-line": `${NOTICE_LIST.linePx}px`,
    "--notice-lines": String(NOTICE_LIST.lines),
    "--notice-badge": `${badge.sizePx}px`,
    "--notice-badge-count": `${badge.countPx}px`,
    "--notice-badge-pulse": `${NOTICE_BADGE_PULSE_MS}ms`,
    "--notice-badge-dim": String(NOTICE_BADGE_PULSE_OPACITY),
  };
}
