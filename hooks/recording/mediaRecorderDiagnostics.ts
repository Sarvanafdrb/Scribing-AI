/**
 * TEMPORARY MediaRecorder diagnostics — remove after root-cause confirmed.
 * Filter console by: [MR-DIAG] or [RECORDING-FAILURE-DIAG]
 */
import {
  recordDiagEvent,
  installRecordingDiagGlobal,
} from "@/hooks/recording/recordingFailureDiagnostics";

const PREFIX = "[MR-DIAG]";

installRecordingDiagGlobal();

/** Events that would flood the 500-slot circular buffer. */
const SKIP_BUFFER = new Set(["heartbeat"]);

export function mrDiag(
  event: string,
  details: Record<string, unknown> = {},
  options?: { trace?: boolean },
) {
  const payload = {
    t: new Date().toISOString(),
    ms: Date.now(),
    event,
    ...details,
  };

  console.log(PREFIX, event, payload);

  if (!SKIP_BUFFER.has(event)) {
    recordDiagEvent(event, {
      file: typeof details.file === "string" ? details.file : undefined,
      fn: typeof details.fn === "string" ? details.fn : undefined,
      details,
      includeStack: Boolean(options?.trace),
      recorderState:
        typeof details.recorderState === "string" ||
        details.recorderState === null
          ? (details.recorderState as string | null)
          : typeof details.state === "string"
            ? details.state
            : undefined,
      sessionStatus:
        typeof details.sessionStatus === "string" ||
        details.sessionStatus === null
          ? (details.sessionStatus as string | null)
          : undefined,
      workflowState:
        typeof details.workflow === "string"
          ? details.workflow
          : typeof details.workflowState === "string"
            ? details.workflowState
            : undefined,
      elapsedRecordingSeconds:
        typeof details.elapsedSeconds === "number"
          ? details.elapsedSeconds
          : undefined,
    });
  }

  if (options?.trace) {
    console.trace(`${PREFIX} TRACE → ${event}`);
  }
}

export function mrDiagStopCall(
  file: string,
  fn: string,
  line: number | string,
  extra: Record<string, unknown> = {},
) {
  mrDiag(
    "STOP_CALL",
    {
      file,
      fn,
      line,
      ...extra,
    },
    { trace: true },
  );
}
