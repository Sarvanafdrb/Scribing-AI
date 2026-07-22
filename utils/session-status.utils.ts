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
  "uploading",
  "processing",
  "transcript_ready",
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

export const canStartRecording = (status?: SessionStatus | string | null) =>
  status !== "completed";
