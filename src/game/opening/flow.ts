/** Day-1 guided steps. Null before the intro ends, and after the flow is finished. */
export const OPENING_STEPS = ["study", "bell", "jobs"] as const;
export type OpeningStep = (typeof OPENING_STEPS)[number];

export function isOpeningStep(value: unknown): value is OpeningStep {
  return typeof value === "string" && (OPENING_STEPS as readonly string[]).includes(value);
}

/** True while a new game is inside the forced day-1 sequence. */
export function openingLocksInput(step: OpeningStep | null, done: boolean): boolean {
  return !done && step != null;
}

/**
 * The notification popup is not persisted. If the job was already accepted,
 * reloading on the bell step would open an empty list, so resume on jobs.
 */
export function openingAfterReload(
  step: OpeningStep | null,
  done: boolean,
  jobs: readonly { status: string }[],
): { openingStep: OpeningStep | null; openingDone: boolean } {
  if (done) return { openingStep: null, openingDone: true };
  const received = jobs.some((job) => job.status === "active" || job.status === "completed");
  if (step === "bell" && received) return { openingStep: "jobs", openingDone: false };
  return { openingStep: step, openingDone: false };
}

/** Escape may close the notification (bell) or the jobs board, and nothing else. */
export function openingEscapeAllowed(state: {
  openingStep: OpeningStep | null;
  openingDone: boolean;
  notificationOpen: boolean;
  careerPanel: string | null;
}): boolean {
  if (!openingLocksInput(state.openingStep, state.openingDone)) return true;
  if (state.openingStep === "bell" && state.notificationOpen) return true;
  if (state.openingStep === "jobs" && state.careerPanel === "jobs") return true;
  return false;
}
