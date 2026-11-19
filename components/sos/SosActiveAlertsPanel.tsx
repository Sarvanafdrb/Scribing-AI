"use client";

import { Eye, Heart, Loader2, MapPin, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SosAlert } from "@/types/sos.types";
import { cn } from "@/lib/utils";

interface SosActiveAlertsPanelProps {
  alerts: SosAlert[];
  loading?: boolean;
  canManage?: boolean;
  onAcknowledge?: (id: string) => void;
  onRespond?: (id: string) => void;
  onResolve?: (id: string) => void;
  pendingId?: string | null;
}

const statusLabel: Record<string, string> = {
  triggered: "Active",
  acknowledged: "Acknowledged",
  responding: "Responding",
};

export function SosActiveAlertsPanel({
  alerts,
  loading,
  canManage,
  onAcknowledge,
  onRespond,
  onResolve,
  pendingId,
}: SosActiveAlertsPanelProps) {
  return (
  <div className="rounded-2xl border border-border/60 bg-white/90 p-4 shadow-sm">
    <div className="mb-4 flex items-center gap-2">
      <Radio className="h-5 w-5 text-red-600" />
      <h2 className="text-lg font-semibold">Active Emergency Alerts</h2>
    </div>

    {loading ? (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading active alerts…
      </div>
    ) : alerts.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No active SOS alerts.
      </p>
    ) : (
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={cn(
              "rounded-xl border-2 border-red-200 bg-red-50/60 p-4",
              alert.status === "triggered" && "animate-pulse",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">
                  {alert.patientName || "General emergency"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                {statusLabel[alert.status] || alert.status}
              </span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-800">
              <p className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-600" />
                {alert.emergencyLabel}
              </p>
              {alert.location ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {alert.location}
                </p>
              ) : null}
              {alert.description ? (
                <p className="text-muted-foreground">{alert.description}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Triggered by {alert.triggeredByName}
                {alert.triggeredByRole ? ` (${alert.triggeredByRole})` : ""}
              </p>
            </div>

            {canManage ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {alert.status === "triggered" ? (
                  <Button
                    size="sm"
                    className="rounded-full bg-red-600 hover:bg-red-700"
                    disabled={pendingId === alert.id}
                    onClick={() => onAcknowledge?.(alert.id)}
                  >
                    Acknowledge
                  </Button>
                ) : null}
                {alert.status === "acknowledged" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={pendingId === alert.id}
                    onClick={() => onRespond?.(alert.id)}
                  >
                    Mark responding
                  </Button>
                ) : null}
                {alert.status !== "resolved" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full border-green-300 text-green-800"
                    disabled={pendingId === alert.id}
                    onClick={() => onResolve?.(alert.id)}
                  >
                    Resolve
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" className="rounded-full" type="button">
                  <Eye className="mr-1 h-4 w-4" />
                  View details
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    )}
  </div>
  );
}