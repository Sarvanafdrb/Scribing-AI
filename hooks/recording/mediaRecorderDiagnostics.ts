/**
 * TEMPORARY MediaRecorder diagnostics — remove after root-cause confirmed.
 * Filter console by: [MR-DIAG]
 */
const PREFIX = "[MR-DIAG]";

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
