"use client";

import { Badge } from "@/components/ui/badge";
import { InvitationStatus } from "@/types/invitation.types";

const statusConfig: Record<
  InvitationStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  },
  REVOKED: {
    label: "Revoked",
    className: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-red-100 text-red-700 hover:bg-red-200",
  },
};

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  const config = statusConfig[status] || statusConfig.PENDING;
  return <Badge className={config.className}>{config.label}</Badge>;
}

export const INVITATION_STATUS_OPTIONS: {
  value: InvitationStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "EXPIRED", label: "Expired" },
  { value: "REVOKED", label: "Revoked" },
];
