"use client";

import { useState } from "react";
import { Button, PixelButton } from "@/components/ui/button";

export function BlockedButton({
  label,
  reason,
  testId,
}: {
  label: string;
  reason: string;
  testId: string;
}) {
  const [shake, setShake] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <PixelButton
        type="button"
        aria-disabled
        data-testid={testId}
        title={reason}
        className={shake ? "btn-shake" : undefined}
        onClick={() => {
          setShake(false);
          requestAnimationFrame(() => setShake(true));
        }}
        onAnimationEnd={() => setShake(false)}
      >
        {label}
      </PixelButton>
      <span className="max-w-40 text-right font-galmuri-7 text-galmuri-small text-[var(--accent-coral)]">
        {reason}
      </span>
    </div>
  );
}
