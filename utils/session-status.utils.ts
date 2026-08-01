import type { SessionStatus } from "@/types/session.types";

/** Statuses that mean transcript content is available (incl. legacy completed). */
export const TRANSCRIPT_AVAILABLE_STATUSES: SessionStatus[] = [
  "transcript_ready",
  "ai_notes_generated",
  "ready_for_review",
  "completed",
];

/** Statuses where the doctor can preview / export / save consultation. */
export const REVIEW_READY_STATUSES: SessionStatus[] = [
  "ai_notes_generated",
  "ready_for_review",
  "completed",
];

/** In-flight statuses that should keep the patient list / session detail polling. */
export const PIPELINE_ACTIVE_STATUSES: SessionStatus[] = [
  "recording",
  "paused",
  "interrupted",
  "resumed",
  "uploading",
  "processing",
  "transcript_ready",
];

/** Statuses that mean an unfinished consultation can be resumed. */
export const RESUMABLE_RECORDING_STATUSES: SessionStatus[] = [
  "recording",
  "paused",
  "interrupted",
  "resumed",
];

/**
 * Pipeline / terminal statuses — never show Resume popup; clear local recovery.
 * Backend is source of truth once upload or later stages have begun.
 */
export const RECOVERY_CLEAR_STATUSES: SessionStatus[] = [
  "uploading",
  "processing",
  "transcript_ready",
  "ai_notes_generated",
  "ready_for_review",
  "completed",
  "failed",
];

/** Backend statuses where an unexpected-interrupt resume dialog is allowed. */
export const UNEXPECTED_INTERRUPT_STATUSES: SessionStatus[] = [
  "recording",
  "paused",
  "interrupted",
  "resumed",
];

export const isTranscriptAvailable = (status?: SessionStatus | string | null) =>
  Boolean(
    status &&
      TRANSCRIPT_AVAILABLE_STATUSES.includes(status as SessionStatus),
  );

export const isReviewReady = (status?: SessionStatus | string | null) =>
  Boolean(
    status && REVIEW_READY_STATUSES.includes(status as SessionStatus),
  );

export const isConsultationCompleted = (
  status?: SessionStatus | string | null,
) => status === "completed";

export const isPipelineActive = (status?: SessionStatus | string | null) =>
  Boolean(
    status && PIPELINE_ACTIVE_STATUSES.includes(status as SessionStatus),
  );

export const isResumableRecording = (
  status?: SessionStatus | string | null,
) =>
  Boolean(
    status && RESUMABLE_RECORDING_STATUSES.includes(status as SessionStatus),
  );

export const shouldClearRecoveryForStatus = (
  status?: SessionStatus | string | null,
) =>
  Boolean(
    status && RECOVERY_CLEAR_STATUSES.includes(status as SessionStatus),
  );

export const isUnexpectedInterruptStatus = (
  status?: SessionStatus | string | null,
) =>
  Boolean(
    status &&
      UNEXPECTED_INTERRUPT_STATUSES.includes(status as SessionStatus),
  );

export const canStartRecording = (status?: SessionStatus | string | null) =>
  status !== "completed";
