"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { PixelButton } from "@/components/ui/button";
import { PanelCard } from "@/components/ui/panel-card";
import { cn } from "@/lib/utils";
import { MODAL, modalContentStyle, modalOverlayStyle } from "./modal.config";
import styles from "./modal.module.css";

/**
 * Centered popup. `Dialog.Content` traps focus, closes on Escape, and
 * closes on a backdrop click. `aria-modal` is set on that dialog.
 * Open motion is the fade and rise in `modal.module.css`; reduced motion
 * skips it. Stacking comes from `modal.config.ts`.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  children,
  testId,
  closeLabel = "Đóng",
  maxWidthPx = MODAL.maxWidthPx,
  allowDismiss = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  testId?: string;
  closeLabel?: string;
  maxWidthPx?: number;
  /** Lets the day-1 lock through to this popup's backdrop and close button. */
  allowDismiss?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={styles.backdrop}
          style={modalOverlayStyle()}
          data-opening-allow={allowDismiss ? "" : undefined}
        />
        <Dialog.Content
          className={cn(styles.content, "fixed left-1/2 top-1/2 flex flex-col overflow-hidden outline-none")}
          style={modalContentStyle(maxWidthPx)}
          aria-modal="true"
          aria-describedby={undefined}
          data-testid={testId}
        >
          <PanelCard className="flex flex-col gap-3 p-3">
            <div className="flex items-center justify-between gap-2">
              <Dialog.Title className="m-0 font-galmuri-11 text-galmuri-title font-normal text-[var(--foreground)]">
                {title}
              </Dialog.Title>
              <Dialog.Close asChild>
                <PixelButton
                  variant="secondary"
                  data-testid={testId ? `${testId}-close` : undefined}
                  data-opening-allow={allowDismiss ? "" : undefined}
                >
                  {closeLabel}
                </PixelButton>
              </Dialog.Close>
            </div>
            <div
              className="min-h-0 overflow-y-auto"
              style={{ maxHeight: `calc(${MODAL.maxHeightVh}vh - ${MODAL.chromePx}px)` }}
            >
              {children}
            </div>
          </PanelCard>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
