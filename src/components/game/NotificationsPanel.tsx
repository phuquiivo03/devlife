"use client";

/* eslint-disable @next/next/no-img-element -- native pixel art stays unoptimized */

import type { CSSProperties, MouseEvent } from "react";
import { m5AssetPath, m51AssetPath, type M5AssetKey } from "@/game/life/assets";
import type {
  LifeNotice,
  Notice,
  NoticeActionButton,
  NoticeActionId,
} from "@/game/career/types";
import { useGameStore } from "@/game/state/store";
import { useState } from "react";
import { Button, PixelButton } from "@/components/ui/button";
import { PanelCard, PanelCardTitle } from "@/components/ui/panel-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  NOTICE_BADGE_COUNT_CAP,
  NOTICE_BADGE_KEY,
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
} from "./notifications.config";
import { isHungerNotice } from "./hunger-notice";
import styles from "./notifications.module.css";

const JOB_BUTTON_IDS = new Set<NoticeActionId>([
  "acceptJob",
  "dismissNotice",
  "openJobs",
]);

function clock(minute: number): string {
  const hour = Math.floor(minute / 60) % 24;
  const rest = minute % 60;
  return `${String(hour).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function jobButtons(notice: LifeNotice): NoticeActionButton[] | null {
  const { actions } = notice;
  if (!actions?.some((button) => JOB_BUTTON_IDS.has(button.id))) return null;
  return actions;
}

function NoticeOffer({
  notice,
  buttons,
  onRead,
  onRun,
}: {
  notice: LifeNotice;
  buttons: NoticeActionButton[];
  onRead: (id: string) => void;
  onRun: (id: NoticeActionId, notice: Notice) => void;
}) {
  return (
    <div className={styles.offer}>
      <button
        type="button"
        className={styles.offerHead}
        onClick={() => onRead(notice.id)}
      >
        <img
          src={m5AssetPath(notice.icon as M5AssetKey)}
          width={NOTICE_LIST.rowIconPx}
          height={NOTICE_LIST.rowIconPx}
          alt=""
          className={`pixel-img mt-1 ${styles.rowIcon}`}
        />
        <span className={styles.offerCopy}>
          <span className={styles.offerLine}>
            <span
              className={`font-galmuri-9 text-galmuri-small ${styles.jobName}`}
            >
              {notice.title ?? notice.text}
            </span>
            <span className={styles.clock}>{clock(notice.minute)}</span>
          </span>
          {notice.detail ? (
            <span className={`font-galmuri-7 ${styles.detail}`}>
              {notice.detail}
            </span>
          ) : null}
        </span>
      </button>
      <span className={`${styles.buttons} mt-2 ml-[18px]`}>
        {buttons.map((button) => (
          <PixelButton
            key={button.id}
            variant={button.variant === "primary" ? "primary" : "secondary"}
            data-testid={`notice-action-${button.id}`}
            onClick={() => onRun(button.id, notice)}
          >
            {button.label}
          </PixelButton>
        ))}
      </span>
    </div>
  );
}

function actionFace(): { style: CSSProperties; glyphPx: number } {
  const metrics = noticeActionButtonMetrics();
  return {
    glyphPx: metrics.glyphPx,
    style: {
      minHeight: metrics.minHeightPx,
      fontFamily:
        "var(--font-galmuri-7), var(--font-galmuri-9), system-ui, sans-serif",
      fontSize: metrics.labelPx,
      lineHeight: 1,
    },
  };
}

function stopRowClick(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function NoticeActionButton({
  action,
  onRun,
}: {
  action: NoticeActionId;
  onRun: (action: NoticeActionId) => void;
}) {
  const control = resolveNoticeAction(action);
  const label = control?.label ?? action;
  const run = (event: MouseEvent<HTMLElement>) => {
    stopRowClick(event);
    onRun(action);
  };
  if (!control || control.kind === "text") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        showArrow={false}
        className="min-h-11 shrink-0"
        data-testid={`notice-action-${action}`}
        data-action-kind="text"
        onClick={run}
      >
        {label}
      </Button>
    );
  }

  const face = actionFace();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={styles.action}>
          <PixelButton
            variant="secondary"
            aria-label={control.label}
            className="shrink-0"
            style={face.style}
            data-testid={`notice-action-${action}`}
            data-action-kind="icon-label"
            onClick={run}
          >
            <img
              src={m51AssetPath(actionIconFile(control.iconKey))}
              alt=""
              width={face.glyphPx}
              height={face.glyphPx}
              draggable={false}
              data-icon-key={control.iconKey}
              className="pixelated block"
              style={{ width: face.glyphPx, height: face.glyphPx }}
            />
            <span>{control.label}</span>
          </PixelButton>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" data-testid={`notice-action-tip-${action}`}>
        {control.label}
      </TooltipContent>
    </Tooltip>
  );
}

function NoticeActionsButton({
  button,
  notice,
  runNoticeAction,
}: {
  button: NoticeActionButton;
  notice: Notice;
  runNoticeAction: (id: NoticeActionId, notice: Notice) => void;
}) {
  const variant = noticeButtonVariant(button.variant);
  const glyph = noticeButtonGlyph(button);
  const face = actionFace();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={styles.action}>
          <PixelButton
            variant={variant}
            aria-label={button.label}
            className="shrink-0"
            style={face.style}
            data-testid={`notice-action-${button.id}`}
            data-action-kind={glyph ? "icon-label" : "label"}
            onClick={(event) => {
              event.stopPropagation();
              runNoticeAction(button.id, notice);
            }}
          >
            {glyph ? (
              <img
                src={m51AssetPath(glyph.file)}
                alt=""
                width={face.glyphPx}
                height={face.glyphPx}
                draggable={false}
                data-icon-key={glyph.iconKey}
                className="pixelated block"
                style={{ width: face.glyphPx, height: face.glyphPx }}
              />
            ) : null}
            <span>{button.label}</span>
          </PixelButton>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" data-testid={`notice-action-tip-${button.id}`}>
        {button.label}
      </TooltipContent>
    </Tooltip>
  );
}

function NoticeRowActions({
  notice,
  onRun,
}: {
  notice: Notice;
  onRun: (id: NoticeActionId, notice: Notice) => void;
}) {
  const buttons = listedNoticeActions(notice);
  // Ensure listedNoticeActions comes before notice.action check for test compliance
  const hasButtons = buttons && buttons.length > 0;
  if (hasButtons) {
    return (
      <div className={styles.actions} data-testid="notice-actions">
        {buttons.map((button, index) => (
          <NoticeActionsButton
            key={`${notice.id}-${button.id}-${index}`}
            button={button}
            notice={notice}
            runNoticeAction={onRun}
          />
        ))}
      </div>
    );
  }
  if (!notice.action) return null;
  return (
    <NoticeActionButton
      action={notice.action}
      onRun={(id) => {
        onRun(id, notice);
      }}
    />
  );
}

export function NotificationsPanel() {
  const notices = useGameStore((s) => s.career.feed?.notices ?? []);
  const readNotice = useGameStore((s) => s.readNotice);
  const readAll = useGameStore((s) => s.readAllNotices);
  const runNoticeAction = useGameStore((s) => s.runNoticeAction);
  const [viewMode, setViewMode] = useState<'new' | 'viewed'>('new');
  const runAction = (action: string, notice?: Notice) => {
    // Job buttons pass the notice so the action applies to that specific row.
    runNoticeAction(action as NoticeActionId, notice);
  };
  const listed = notices.filter((notice) => !isHungerNotice(notice));
  const unreadNotices = listed.filter((notice) => !notice.read);
  const readNotices = listed.filter((notice) => notice.read);
  const displayedNotices = viewMode === 'new' ? unreadNotices : readNotices;
  const ordered = [...displayedNotices].reverse();
  const badge = noticeBadgeMetrics();

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3 p-4"
      style={noticeChromeStyle()}
    >
      <div className="flex items-center justify-between gap-2">
        <PanelCardTitle>Thông báo</PanelCardTitle>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            showArrow={false}
            onClick={() => setViewMode(viewMode === 'new' ? 'viewed' : 'new')}
            data-testid="notice-view-toggle"
          >
            {viewMode === 'new' ? 'Đã xem' : 'Mới'}
          </Button>
          {unreadNotices.length > 0 && viewMode === 'new' ? (
            <span
              className={styles.badge}
              data-testid="notice-badge"
              data-count={unreadNotices.length}
            >
              <img
                src={m51AssetPath(noticeBadgeFile())}
                width={badge.sizePx}
                height={badge.sizePx}
                alt=""
                data-icon-key={NOTICE_BADGE_KEY}
                className="pixel-img"
                style={{ width: badge.sizePx, height: badge.sizePx }}
              />
              <span className={`font-galmuri-7 ${styles.count}`}>
                {unreadNotices.length > NOTICE_BADGE_COUNT_CAP
                  ? NOTICE_BADGE_COUNT_CAP
                  : unreadNotices.length}
              </span>
            </span>
          ) : null}
        </div>
      </div>
      {unreadNotices.length > 0 && viewMode === 'new' ? (
        <PixelButton type="button" variant="light" onClick={readAll}>
          Đã đọc
        </PixelButton>
      ) : null}
      <div className={styles.scroll}>
        {ordered.length === 0 ? (
          <p
            className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]"
            data-testid="notice-empty"
          >
            {viewMode === 'new' ? 'Chưa có thông báo mới.' : 'Chưa có thông báo đã xem.'}
          </p>
        ) : (
          <ul className={styles.list} data-testid="notice-list">
            {ordered.map((notice) => {
              const buttons = jobButtons(notice);
              return (
                <li key={notice.id}>
                  <PanelCard
                    className={styles.item}
                    data-testid={`notice-${notice.id}`}
                    data-read={notice.read ? "1" : "0"}
                  >
                    {buttons ? (
                      <NoticeOffer
                        notice={notice}
                        buttons={buttons}
                        onRead={readNotice}
                        onRun={runAction}
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          className={styles.body}
                          onClick={() => readNotice(notice.id)}
                        >
                          <img
                            src={m5AssetPath(notice.icon as M5AssetKey)}
                            width={NOTICE_LIST.rowIconPx}
                            height={NOTICE_LIST.rowIconPx}
                            alt=""
                            className={`pixel-img ${styles.rowIcon}`}
                          />
                          <span className={`font-galmuri-7 ${styles.copy}`}>
                            <span className={styles.clock}>
                              {clock(notice.minute)}{" "}
                            </span>
                            {notice.text}
                          </span>
                        </button>
                        <NoticeRowActions
                          notice={notice}
                          onRun={runNoticeAction}
                        />
                      </>
                    )}
                  </PanelCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
