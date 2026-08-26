import type { SessionStatus } from "@/types/session.types";

export const QUEUE_STATUS_STYLES: Partial<
  Record<
    SessionStatus,
    { label: string; shortLabel?: string; className: string }
  >
> = {
  recording: {
    label: "Recording",
    shortLabel: "Rec",
    className: "bg-red-500/15 text-red-600 dark:text-red-300",
  },
  paused: {
    label: "Paused",
    shortLabel: "Paused",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  interrupted: {
    label: "Interrupted",
    shortLabel: "Hold",
    className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  },
  resumed: {
    label: "Resumed",
    shortLabel: "Live",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  uploading: {
    label: "Uploading",
    shortLabel: "Upload",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  processing: {
    label: "Processing",
    shortLabel: "Processing",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  transcript_ready: {
    label: "Transcript Ready",
    shortLabel: "Transcript",
    className: "bg-primary/10 text-primary",
  },
  ai_notes_generated: {
    label: "AI Notes Generated",
    shortLabel: "AI Notes",
    className: "bg-primary/10 text-primary",
  },
  ready_for_review: {
    label: "Ready for Review",
    shortLabel: "Review",
    className: "bg-primary/10 text-primary",
  },
  completed: {
    label: "Completed",
    shortLabel: "Done",
    className: "bg-primary/10 text-primary",
  },
  failed: {
    label: "Failed",
    shortLabel: "Failed",
    className: "bg-red-500/15 text-red-600 dark:text-red-300",
  },
  created: {
    label: "WAIT",
    shortLabel: "Wait",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
};

export const getQueueStatusLabel = (
  status: SessionStatus | undefined,
  compact = false,
): string | undefined => {
  if (!status) return undefined;
  const style = QUEUE_STATUS_STYLES[status];
  if (!style) return undefined;
  return compact ? style.shortLabel || style.label : style.label;
};
