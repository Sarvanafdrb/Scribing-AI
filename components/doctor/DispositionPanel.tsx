"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/hooks/sessions/useSession";
import { AdmitPatientModal } from "@/components/doctor/AdmitPatientModal";
import { encounterService } from "@/services/encounter.service";
import { sessionKeys } from "@/services/session.queries";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import { getEncounterType } from "@/utils/encounter.utils";
import type { DispositionType } from "@/types/encounter.types";
import { cn } from "@/lib/utils";
import { isConsultationCompleted } from "@/utils/session-status.utils";

interface DispositionPanelProps {
  sessionId: string;
}

const OPTIONS: Array<{ value: DispositionType; label: string }> = [
  { value: "home", label: "Home" },
  { value: "follow_up", label: "Follow-up" },
  { value: "admit", label: "Admit Patient" },
];

export function DispositionPanel({ sessionId }: DispositionPanelProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession(sessionId);
  const admitOpen = useEncounterUiStore((s) => s.admitModalOpen);
  const setAdmitOpen = useEncounterUiStore((s) => s.setAdmitModalOpen);
  const isIp = getEncounterType(session) === "IP";
  const isCompleted = isConsultationCompleted(session?.status);

  const dispositionMutation = useMutation({
    mutationFn: (disposition: DispositionType) =>
      encounterService.setDisposition(sessionId, disposition),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(sessionId),
      });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error?.response?.data?.message || "Failed to save disposition",
      );
    },
  });

  return (
    <>
      {/* Keep Admit modal mounted even after IP conversion so Dialog overlay
          can close cleanly (unmount-while-open left a click-blocking layer). */}
      <AdmitPatientModal
        sessionId={sessionId}
        open={admitOpen}
        onOpenChange={setAdmitOpen}
      />

      {!isIp && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Disposition
          </h3>
          <div className="space-y-2">
            {OPTIONS.map((option) => {
              const selected = session?.disposition === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors",
                    selected
                      ? "border-teal-300 bg-teal-50 text-teal-800"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50",
                    isCompleted && "opacity-70",
                  )}
                >
                  <input
                    type="radio"
                    name={`disposition-${sessionId}`}
                    checked={selected}
                    disabled={dispositionMutation.isPending}
                    onChange={() => {
                      if (option.value === "admit") {
                        setAdmitOpen(true);
                        return;
                      }
                      dispositionMutation.mutate(option.value);
                    }}
                    className="accent-teal-600"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
