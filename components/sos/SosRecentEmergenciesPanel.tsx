"use client";

import { CheckCircle2, Clock3, Loader2 } from "lucide-react";
import type { SosAlert } from "@/types/sos.types";
import { cn } from "@/lib/utils";

interface SosRecentEmergenciesPanelProps {
  alerts: SosAlert[];
  loading?: boolean;
}

export function SosRecentEmergenciesPanel({
  alerts,
  loading,
}: SosRecentEmergenciesPanelProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/90 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Emergencies</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading history…
        </div>
      ) : alerts.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">No recent emergencies.</p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => {
            const resolved = alert.status === "resolved";
            const inProgress =
              alert.status === "acknowledged" || alert.status === "responding";
            const Icon = resolved ? CheckCircle2 : Clock3;
            const iconClass = resolved
              ? "text-green-600"
              : inProgress
                ? "text-amber-600"
                : "text-red-600";
            return (
              <li key={alert.id} className="flex gap-3 text-sm">
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} />
                <div>
                  <p className="font-medium text-foreground">
                    {resolved ? "Resolved" : inProgress ? "In progress" : "Active"}{" "}
                    · {new Date(alert.createdAt).toLocaleString()}
                  </p>
                  <p className="text-muted-foreground">
                    {alert.emergencyLabel}
                    {alert.patientName ? ` — ${alert.patientName}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}