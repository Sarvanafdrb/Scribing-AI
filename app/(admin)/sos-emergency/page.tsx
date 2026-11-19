"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SosEmergencyHeader } from "@/components/sos/SosEmergencyHeader";
import { SosTriggerForm } from "@/components/sos/SosTriggerForm";
import { SosActiveAlertsPanel } from "@/components/sos/SosActiveAlertsPanel";
import { SosRecentEmergenciesPanel } from "@/components/sos/SosRecentEmergenciesPanel";
import { useTenantScope } from "@/hooks/useTenantScope";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useActiveSosAlerts, useSosHistory } from "@/hooks/sos/useSosAlerts";
import { useSosMutations } from "@/hooks/sos/useSosMutations";
import { AccessDenied } from "@/components/shared/AccessDenied";

export default function SosEmergencyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedPatientId = searchParams.get("patientId") || "";
  const patientLinked = searchParams.get("patientLinked") === "1";
  const { organizationId, isScopeReady } = useTenantScope();
  const { canViewSos, canManageSos, canTriggerSos } = useAccessControl();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [formPatientId, setFormPatientId] = useState(linkedPatientId);

  useEffect(() => {
    if (!linkedPatientId) return;
    setFormPatientId(linkedPatientId);
    if (patientLinked) {
      toast.success("Patient created successfully");
      router.replace("/sos-emergency", { scroll: false });
    }
  }, [linkedPatientId, patientLinked, router]);

  const { data: activeData, isLoading: activeLoading } = useActiveSosAlerts(
    organizationId,
    canViewSos() && isScopeReady,
  );
  const { data: historyData, isLoading: historyLoading } = useSosHistory(
    organizationId,
    canViewSos() && isScopeReady,
  );
  const { triggerSos, acknowledge, respond, resolve } = useSosMutations(
    organizationId,
  );

  if (!canViewSos()) {
    return <AccessDenied message="You do not have permission to view SOS emergencies." />;
  }

  if (!isScopeReady || !organizationId) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading workspace…
      </div>
    );
  }

  const summary = activeData?.summary;

  return (
    <div className="space-y-6 pb-10">
      <SosEmergencyHeader />

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Active alerts", value: summary.active },
            { label: "Critical (new)", value: summary.critical },
            { label: "Acknowledged", value: summary.acknowledged },
            { label: "Responding", value: summary.responding },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-red-100 bg-white px-4 py-3 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-red-700">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {canTriggerSos() ? (
          <SosTriggerForm
            organizationId={organizationId}
            defaultPatientId={formPatientId || undefined}
            pending={triggerSos.isPending}
            submitError={
              triggerSos.isError
                ? (triggerSos.error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || "Failed to trigger SOS"
                : null
            }
            onSubmit={async (payload) => {
              await triggerSos.mutateAsync({
                ...payload,
                organizationId,
              });
            }}
          />
        ) : (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            You can monitor alerts here. Trigger permission is not assigned to your
            role.
          </div>
        )}

        <div className="space-y-6">
          <SosActiveAlertsPanel
            alerts={activeData?.alerts || []}
            loading={activeLoading}
            canManage={canManageSos()}
            pendingId={pendingId}
            onAcknowledge={async (id) => {
              setPendingId(id);
              try {
                await acknowledge.mutateAsync({ id });
              } finally {
                setPendingId(null);
              }
            }}
            onRespond={async (id) => {
              setPendingId(id);
              try {
                await respond.mutateAsync({ id });
              } finally {
                setPendingId(null);
              }
            }}
            onResolve={async (id) => {
              setPendingId(id);
              try {
                await resolve.mutateAsync({ id });
              } finally {
                setPendingId(null);
              }
            }}
          />
          <SosRecentEmergenciesPanel
            alerts={historyData?.alerts || []}
            loading={historyLoading}
          />
        </div>
      </div>
    </div>
  );
}