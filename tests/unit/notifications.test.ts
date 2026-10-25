import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { SIM_CATALOG } from "@/game/career/content";
import { defaultCareer } from "@/game/career/actions";
import type { PlayerJob } from "@/game/career/types";
import { applyJobDeadlines } from "@/game/jobs/deadlines";
import { offerJob } from "@/game/jobs/logic";
import { LIFE } from "@/game/life/content";
import { useGameStore } from "@/game/state/store";
import { BUTTON_UI_SCALE, buttonMetrics } from "@/components/ui/button/config";
import {
  NOTICE_ACTION_ICONS,
  NOTICE_ACTION_ICON_NATIVE_PX,
  NOTICE_ACTION_LABEL_PX,
  NOTICE_ACTION_LABELS,
  NOTICE_BADGE_COUNT_CAP,
  NOTICE_BADGE_COUNT_PX,
  NOTICE_BADGE_KEY,
  NOTICE_BADGE_NATIVE_PX,
  NOTICE_BADGE_PULSE_MS,
  NOTICE_BADGE_PULSE_OPACITY,
  NOTICE_BADGE_SCALE,
  NOTICE_LIST,
  actionIconFile,
  listedNoticeActions,
  noticeActionButtonMetrics,
  noticeBadgeFile,
  noticeBadgeMetrics,
  noticeButtonGlyph,
  noticeButtonVariant,
  noticeChromeStyle,
  resolveNoticeAction,
} from "@/components/game/notifications.config";
import sliceDoc from "../../public/ui/m5_1/slices.json";

const ART = join(process.cwd(), "public/ui/m5_1");

function readPng(file: string): PNG {
  return PNG.sync.read(readFileSync(join(ART, file)));
}

describe("notification art", () => {
  it("keeps the shared badge slice at 16", () => {
    expect(sliceDoc.ui_badge_unread_lg.size).toEqual([16, 16]);
    expect(sliceDoc.ui_badge_unread_lg.note).toContain("white");
    expect(sliceDoc["ui_btn_*"].slice).toBe(8);
  });

  it("ships the unread disc and the five action glyphs at native and 2×", () => {
    for (const scale of [1, 2] as const) {
      const badge = readPng(noticeBadgeFile(scale));
      expect(existsSync(join(ART, noticeBadgeFile(scale)))).toBe(true);
      expect(badge.width).toBe(NOTICE_BADGE_NATIVE_PX * scale);
      expect(badge.height).toBe(NOTICE_BADGE_NATIVE_PX * scale);
      for (const key of Object.values(NOTICE_ACTION_ICONS)) {
        const file = actionIconFile(key, scale);
        const icon = readPng(file);
        expect(existsSync(join(ART, file))).toBe(true);
        expect(icon.width).toBe(NOTICE_ACTION_ICON_NATIVE_PX * scale);
        expect(icon.height).toBe(NOTICE_ACTION_ICON_NATIVE_PX * scale);
      }
    }
  });
});

describe("notification metrics", () => {
  it("draws the unread disc at 16 CSS px with an 8px count", () => {
    const badge = noticeBadgeMetrics();
    expect(NOTICE_BADGE_SCALE).toBe(1);
    expect(badge.sizePx).toBe(16);
    expect(badge.countPx).toBe(NOTICE_BADGE_COUNT_PX);
    expect(NOTICE_BADGE_COUNT_PX).toBe(8);
    expect(NOTICE_BADGE_COUNT_CAP).toBe(9);
    expect(NOTICE_BADGE_PULSE_MS).toBe(1600);
    expect(NOTICE_BADGE_PULSE_OPACITY).toBe(0.75);
    expect(NOTICE_BADGE_KEY).toBe("ui_badge_unread_lg");
  });

  it("keeps rows tighter than the previous card and clamps to two lines", () => {
    expect(NOTICE_LIST.paddingPx).toBeLessThan(12);
    expect(NOTICE_LIST.rowIconPx).toBe(16);
    expect(NOTICE_LIST.textPx).toBe(16);
    expect(NOTICE_LIST.textPx).toBeLessThan(20);
    expect(NOTICE_LIST.lines).toBe(2);
    expect(NOTICE_LIST.linePx).toBe(16);
    const style = noticeChromeStyle();
    expect(style["--notice-pad"]).toBe("8px");
    expect(style["--notice-lines"]).toBe("2");
    expect(style["--notice-badge"]).toBe("16px");
    expect(style["--notice-badge-pulse"]).toBe("1600ms");
  });

  it("fits the native glyph and a 16px label in the shared button", () => {
    const metrics = noticeActionButtonMetrics();
    const frame = buttonMetrics(BUTTON_UI_SCALE);
    expect(metrics.minHeightPx).toBe(frame.minHeightPx);
    expect(metrics.minHeightPx).toBeGreaterThanOrEqual(44);
    expect(metrics.centerPx).toBe(NOTICE_ACTION_ICON_NATIVE_PX);
    expect(metrics.glyphPx).toBe(16);
    expect(metrics.labelPx).toBe(NOTICE_ACTION_LABEL_PX);
    expect(NOTICE_ACTION_LABEL_PX).toBe(16);
  });
});

describe("notification actions", () => {
  it("counts the bell badge with the same hunger filter as the panel list", () => {
    // The panel hides No bụng reminders; the badge must not advertise rows
    // the opened panel never shows (reported as "badge 5, list 2").
    const button = readFileSync(
      join(process.cwd(), "src/components/game/NotificationsButton.tsx"),
      "utf8",
    );
    expect(button).toContain("isHungerNotice");
    const panel = readFileSync(
      join(process.cwd(), "src/components/game/NotificationsPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain("isHungerNotice");
  });

  it("maps the five spec glyphs and keeps the old labels", () => {
    expect(resolveNoticeAction("payRent")).toEqual({
      kind: "icon",
      label: "Trả trọ",
      iconKey: "icon_action_pay_rent",
    });
    expect(resolveNoticeAction("viewJobs")).toEqual({
      kind: "icon",
      label: "Xem job",
      iconKey: "icon_action_view_job",
    });
    expect(resolveNoticeAction("openStore")).toEqual({
      kind: "icon",
      label: "Mở store",
      iconKey: "icon_action_open_store",
    });
    expect(resolveNoticeAction("eat")).toEqual({
      kind: "icon",
      label: "Ăn",
      iconKey: "icon_action_eat",
    });
    expect(resolveNoticeAction("sleep")).toEqual({
      kind: "icon",
      label: "Ngủ",
      iconKey: "icon_action_sleep",
    });
    expect(NOTICE_ACTION_LABELS.payRent).toBe("Trả trọ");
    expect(NOTICE_ACTION_LABELS.viewJobs).toBe("Xem job");
    expect(NOTICE_ACTION_LABELS.openStore).toBe("Mở store");
    expect(NOTICE_ACTION_LABELS.eat).toBe("Ăn");
    expect(NOTICE_ACTION_LABELS.sleep).toBe("Ngủ");
  });

  it("falls back to the text button when a label has no glyph", () => {
    expect(resolveNoticeAction("payRent", {})).toEqual({ kind: "text", label: "Trả trọ" });
    expect(resolveNoticeAction("unknown")).toBeNull();
  });

  it("renders the glyph and the label, and forwards every id including eat and sleep", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/game/NotificationsPanel.tsx"),
      "utf8",
    );
    const css = readFileSync(
      join(process.cwd(), "src/components/game/notifications.module.css"),
      "utf8",
    );
    expect(source).toContain('variant="secondary"');
    expect(source).not.toContain('variant="icon"');
    expect(source).toContain("aria-label={control.label}");
    expect(source).toContain("{control.label}");
    expect(source).toContain("TooltipContent");
    expect(source).toContain('data-action-kind="icon-label"');
    expect(source).toContain("runNoticeAction");
    expect(source).toContain("onRun(button.id, notice)");
    expect(source).toContain("notice.detail");
    expect(source).toContain("noticeBadgeFile()");
    expect(source).toContain('data-action-kind="text"');
    expect(source).not.toContain("title=");
    expect(source).not.toContain("StorePanel");
    expect(source).not.toContain("storeOpen");
    expect(css).toContain("overflow-y: auto");
    expect(css).toContain("line-clamp: var(--notice-lines)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(/animation:\s*none/);
  });

  it("draws one button per actions entry and keeps the single action when that list is empty", () => {
    expect(noticeButtonVariant("primary")).toBe("primary");
    expect(noticeButtonVariant("secondary")).toBe("secondary");
    expect(noticeButtonVariant(undefined)).toBe("secondary");

    expect(noticeButtonGlyph({ id: "openJobs", label: "Làm" })).toEqual({
      iconKey: "icon_action_view_job",
      file: "icon_action_view_job.png",
    });
    expect(noticeButtonGlyph({ id: "viewJobs", label: "Xem job" })?.iconKey).toBe("icon_action_view_job");
    expect(noticeButtonGlyph({ id: "payRent", label: "Trả trọ" })?.file).toBe("icon_action_pay_rent.png");
    expect(noticeButtonGlyph({ id: "acceptJob", label: "Nhận" })).toBeNull();
    expect(noticeButtonGlyph({ id: "dismissNotice", label: "Bỏ qua" })).toBeNull();
    expect(noticeButtonGlyph({ id: "acceptJob", label: "Nhận", icon: "icon_action_eat" })).toEqual({
      iconKey: "icon_action_eat",
      file: "icon_action_eat.png",
    });
    expect(noticeButtonGlyph({ id: "openJobs", label: "Làm", icon: "icon_custom.png" })).toEqual({
      iconKey: "icon_custom",
      file: "icon_custom.png",
    });

    const offer = [
      { id: "acceptJob" as const, label: "Nhận", variant: "primary" as const },
      { id: "dismissNotice" as const, label: "Bỏ qua", variant: "secondary" as const },
    ];
    expect(listedNoticeActions({ actions: offer })).toEqual(offer);
    expect(listedNoticeActions({ actions: [] })).toBeNull();
    expect(listedNoticeActions({})).toBeNull();

    const source = readFileSync(
      join(process.cwd(), "src/components/game/NotificationsPanel.tsx"),
      "utf8",
    );
    const css = readFileSync(
      join(process.cwd(), "src/components/game/notifications.module.css"),
      "utf8",
    );
    expect(source).toContain("listedNoticeActions(notice)");
    expect(source).toContain("noticeButtonVariant(button.variant)");
    expect(source).toContain("noticeButtonGlyph(button)");
    expect(source).toContain("runNoticeAction(button.id, notice)");
    expect(source).toContain("event.stopPropagation()");
    expect(source).toContain("isHungerNotice");
    expect(source).toContain('variant="secondary"');
    expect(source).toContain('data-action-kind="text"');
    expect(source.indexOf("listedNoticeActions(notice)")).toBeLessThan(source.indexOf("notice.action"));
    expect(css).toContain("flex-wrap: wrap");
  });

  it("renders a deadline reminder as Làm and calls runNoticeAction('openJobs', notice)", () => {
    const base = defaultCareer(1, 8 * 60, "student", SIM_CATALOG);
    const template = SIM_CATALOG.jobTemplates[0]!;
    const soon: PlayerJob = {
      ...offerJob(template, 1),
      id: "soon-job",
      status: "active",
      accepted_day: 1,
      deadline_day: 4,
      progress_hours: 1,
    };
    const reminded = applyJobDeadlines(
      { ...base, player_jobs: [soon] },
      soon.deadline_day! - LIFE.job_remind_days,
      9 * 60,
    );
    const notice = reminded.feed.notices.find((row) => row.id === "deadline-soon-job");
    expect(notice?.payload).toEqual({ jobId: "soon-job" });
    expect(notice?.text).toContain("Còn 1 ngày");

    const buttons = listedNoticeActions(notice ?? {});
    expect(buttons).toEqual([{ id: "openJobs", label: "Làm", variant: "primary" }]);
    const button = buttons?.[0];
    if (!button || !notice) throw new Error("deadline reminder missing");
    expect(noticeButtonVariant(button.variant)).toBe("primary");
    expect(noticeButtonGlyph(button)).toEqual({
      iconKey: "icon_action_view_job",
      file: "icon_action_view_job.png",
    });

    const source = readFileSync(
      join(process.cwd(), "src/components/game/NotificationsPanel.tsx"),
      "utf8",
    );
    expect(source).toContain("runNoticeAction(button.id, notice)");
    expect(source).toContain("listedNoticeActions(notice)");

    useGameStore.setState({
      career: reminded,
      careerPanel: null,
      taskJobId: null,
    });
    useGameStore.getState().runNoticeAction(button.id, notice);
    expect(useGameStore.getState().taskJobId).toBe("soon-job");
    expect(useGameStore.getState().career.player_jobs.find((row) => row.id === "soon-job")?.task_run?.step).toBe(
      "ticket",
    );
  });
});
