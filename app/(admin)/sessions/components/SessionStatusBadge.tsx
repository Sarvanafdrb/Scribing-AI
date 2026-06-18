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
  processing: {
    label: "Processing",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 hover:bg-green-200",
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
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
  ];

export const SESSION_TYPE_OPTIONS = [
  { value: "consultation", label: "Consultation" },
  { value: "follow_up", label: "Follow Up" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "other", label: "Other" },
];
