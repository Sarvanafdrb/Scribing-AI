/**
 * TEMPORARY recording-failure diagnostic buffer.
 * Auto-dumps when recorder goes recording/paused → idle without stopped.
 * Remove after root cause is confirmed.
 */

export type RecordingDiagEvent = {
  seq: number;
  t: string;
  ms: number;
  event: string;
  file?: string;
  fn?: string;
  recorderState?: string | null;
  workflowState?: string | null;
  sessionStatus?: string | null;
  elapsedRecordingSeconds?: number | null;
  details?: Record<string, unknown>;
  stack?: string;
};

const BUFFER_SIZE = 500;
const PREFIX = "[RECORDING-FAILURE-DIAG]";

const buffer: RecordingDiagEvent[] = [];
let seq = 0;
let dumped = false;

/** Shared context updated by panels / recorder (diagnostics only). */
let context: {
  recorderState: string | null;
  workflowState: string | null;
  sessionStatus: string | null;
  elapsedRecordingSeconds: number | null;
  file?: string;
  fn?: string;
} = {
  recorderState: null,
  workflowState: null,
  sessionStatus: null,
  elapsedRecordingSeconds: null,
};

let prevRecorderState: string | null = null;

function captureStack(): string {
  try {
    const err = new Error("recording-diag-stack");
    return err.stack || "(no stack)";
  } catch {
    return "(stack unavailable)";
  }
}

export function setRecordingDiagContext(
  patch: Partial<typeof context>,
): void {
  context = { ...context, ...patch };
}

export function recordDiagEvent(
  event: string,
  options?: {
    file?: string;
    fn?: string;
    details?: Record<string, unknown>;
    includeStack?: boolean;
    recorderState?: string | null;
    workflowState?: string | null;
    sessionStatus?: string | null;
    elapsedRecordingSeconds?: number | null;
  },
): void {
  const entry: RecordingDiagEvent = {
    seq: ++seq,
    t: new Date().toISOString(),
    ms: Date.now(),
    event,
    file: options?.file ?? context.file,
    fn: options?.fn ?? context.fn,
    recorderState:
      options?.recorderState !== undefined
        ? options.recorderState
        : context.recorderState,
    workflowState:
      options?.workflowState !== undefined
        ? options.workflowState
        : context.workflowState,
    sessionStatus:
      options?.sessionStatus !== undefined
        ? options.sessionStatus
        : context.sessionStatus,
    elapsedRecordingSeconds:
      options?.elapsedRecordingSeconds !== undefined
        ? options.elapsedRecordingSeconds
        : context.elapsedRecordingSeconds,
    details: options?.details,
    stack: options?.includeStack ? captureStack() : undefined,
  };

  buffer.push(entry);
  if (buffer.length > BUFFER_SIZE) {
    buffer.shift();
  }
}

/**
 * Call whenever React recorder state changes.
 * Dumps buffer if we jump recording/paused → idle without stopped.
 */
export function notifyRecorderStateChange(
  nextState: string,
  meta?: {
    file?: string;
    fn?: string;
    details?: Record<string, unknown>;
  },
): void {
  const prev = prevRecorderState;
  setRecordingDiagContext({ recorderState: nextState });
  recordDiagEvent("recorder.stateChange", {
    file: meta?.file ?? "useMediaRecorder.ts",
    fn: meta?.fn ?? "notifyRecorderStateChange",
    recorderState: nextState,
    details: { from: prev, to: nextState, ...meta?.details },
    includeStack: true,
  });

  const wasActive = prev === "recording" || prev === "paused";
  const skippedStopped = prev !== "stopped" && nextState === "idle";

  // Re-arm auto-dump for the next unexpected failure after a fresh recording.
  if (nextState === "recording") {
    dumped = false;
  }

  if (wasActive && skippedStopped && nextState === "idle") {
    dumpRecordingFailureReport({
      firstEventHint: "unexpected recording/paused → idle (skipped stopped)",
      rootTriggerHint: prev ? `${prev} → idle` : "unknown → idle",
      transitionStack: captureStack(),
    });
  }

  prevRecorderState = nextState;
}

export function dumpRecordingFailureReport(meta?: {
  firstEventHint?: string;
  rootTriggerHint?: string;
  transitionStack?: string;
}): void {
  if (dumped) {
    console.warn(
      PREFIX,
      "Failure report already dumped for this recording cycle; skipping duplicate.",
    );
    return;
  }
  dumped = true;

  const events = [...buffer];
  const first = events[0];
  const last = events[events.length - 1];

  // Prefer the last stateChange to idle as root; else last event before idle.
  const transitionIdx = [...events]
    .reverse()
    .findIndex(
      (e) =>
        e.event === "recorder.stateChange" &&
        e.details?.to === "idle" &&
        (e.details?.from === "recording" || e.details?.from === "paused"),
    );
  const rootIdx =
    transitionIdx === -1 ? events.length - 1 : events.length - 1 - transitionIdx;
  const root = events[rootIdx] ?? last;

  // Event immediately before the unexpected idle transition (best root-cause signal).
  const rootTrigger =
    rootIdx > 0 ? events[rootIdx - 1] : (events.find((e) =>
      [
        "shouldShowLoading",
        "workspaceGuardLoading",
        "shouldBlock",
        "loadingSpinner",
        "layout.render.null",
        "router.replace",
        "unmount",
        "cleanup",
        "STOP_CALL",
        "stopStream",
        "onerror",
        "track.ended",
        "reset",
      ].some((k) => e.event.toLowerCase().includes(k.toLowerCase())),
    ) ?? first);

  console.error("===== RECORDING FAILURE REPORT =====");
  console.error(PREFIX, {
    dumpedAt: new Date().toISOString(),
    eventCount: events.length,
    hint: meta?.firstEventHint,
    transition: meta?.rootTriggerHint,
  });
  console.error("***** FIRST EVENT *****");
  console.error(first);
  console.error("***** ROOT TRIGGER *****");
  console.error(rootTrigger ?? meta?.rootTriggerHint);
  console.error("***** LAST EVENT *****");
  console.error(last);
  console.error("***** COMPLETE STACK (first unexpected transition) *****");
  console.error(meta?.transitionStack ?? root?.stack ?? captureStack());
  console.error("***** CHRONOLOGICAL BUFFER (oldest → newest) *****");
  for (const e of events) {
    console.error(
      `#${e.seq} ${e.t} | ${e.event} | file=${e.file} fn=${e.fn} | recorder=${e.recorderState} workflow=${e.workflowState} session=${e.sessionStatus} elapsed=${e.elapsedRecordingSeconds}s`,
      e.details ?? {},
    );
  }
  console.error("===== END RECORDING FAILURE REPORT =====");
}

/** Manual dump helper for DevTools: window.__dumpRecordingDiag() */
export function installRecordingDiagGlobal(): void {
  if (typeof window === "undefined") return;
  (window as unknown as { __dumpRecordingDiag?: () => void }).__dumpRecordingDiag =
    () => {
      dumped = false;
      dumpRecordingFailureReport({
        firstEventHint: "manual dump via window.__dumpRecordingDiag()",
      });
    };
  (window as unknown as { __recordingDiagBuffer?: () => RecordingDiagEvent[] }).__recordingDiagBuffer =
    () => [...buffer];
}
