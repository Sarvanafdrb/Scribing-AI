"use client";

import { Badge } from "@/components/ui/badge";
import { SessionStatus } from "@/types/session.types";

const statusConfig: Record<
  SessionStatus,
  { label: string; className: string }
> = {
  created: {
    label: "Created",
    className: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  },
  recording: {
    label: "Recording",
    className: "bg-red-100 text-red-700 hover:bg-red-200",
  },
  paused: {
    label: "Paused",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
  interrupted: {
    label: "Interrupted",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  },
  resumed: {
    label: "Resumed",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  },
  uploading: {
    label: "Uploading",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  },
  processing: {
    label: "Processing Transcript",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  },
  transcript_ready: {
    label: "Transcript Ready",
    className: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  ai_notes_generated: {
    label: "AI Notes Generated",
    className: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  ready_for_review: {
    label: "Ready for Review",
    className: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  completed: {
    label: "Completed",
    className: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  failed: {
    label: "Failed",
    className: "bg-red-600 text-white hover:bg-red-700",
  },
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const config = statusConfig[status] || statusConfig.created;

  return <Badge className={config.className}>{config.label}</Badge>;
}

export const SESSION_STATUS_OPTIONS: { value: SessionStatus; label: string }[] =
  [
    { value: "created", label: "Created" },
    { value: "recording", label: "Recording" },
    { value: "paused", label: "Paused" },
    { value: "interrupted", label: "Interrupted" },
    { value: "resumed", label: "Resumed" },
    { value: "uploading", label: "Uploading" },
    { value: "processing", label: "Processing Transcript" },
    { value: "transcript_ready", label: "Transcript Ready" },
    { value: "ai_notes_generated", label: "AI Notes Generated" },
    { value: "ready_for_review", label: "Ready for Review" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
  ];

export const SESSION_TYPE_OPTIONS = [
  { value: "consultation", label: "Consultation" },
  { value: "follow_up", label: "Follow Up" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "other", label: "Other" },
];
