import type { SessionStatus } from "@/types/session.types";

export const QUEUE_STATUS_STYLES: Partial<
  Record<SessionStatus, { label: string; className: string }>
> = {
  recording: {
    label: "Recording",
    className: "bg-red-500/15 text-red-600 dark:text-red-300",
  },
  paused: {
    label: "Paused",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  interrupted: {
    label: "Interrupted",
    className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  },
  resumed: {
    label: "Resumed",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  uploading: {
    label: "Uploading",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  processing: {
    label: "Processing",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  transcript_ready: {
    label: "Transcript Ready",
    className: "bg-primary/10 text-primary",
  },
  ai_notes_generated: {
    label: "AI Notes Generated",
    className: "bg-primary/10 text-primary",
  },
  ready_for_review: {
    label: "Ready for Review",
    className: "bg-primary/10 text-primary",
  },
  completed: {
    label: "Completed",
    className: "bg-primary/10 text-primary",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/15 text-red-600 dark:text-red-300",
  },
  created: {
    label: "WAIT",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
};
