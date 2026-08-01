"use client";

import { cn } from "@/lib/utils";
import { formatEncounterBadge } from "@/utils/encounter.utils";
import type { Session } from "@/types/session.types";

interface EncounterStatusBadgeProps {
  session?: Session | null;
  className?: string;
  compact?: boolean;
}

export function EncounterStatusBadge({
  session,
  className,
  compact = false,
}: EncounterStatusBadgeProps) {
  const badge = formatEncounterBadge(session);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        badge.kind === "OP"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-sky-50 text-sky-700",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          badge.kind === "OP" ? "bg-emerald-500" : "bg-sky-500",
        )}
        aria-hidden
      />
      {compact && badge.kind === "IP"
        ? `IP • Day ${session?.admissionDay || 1}`
        : badge.label}
    </span>
  );
}
