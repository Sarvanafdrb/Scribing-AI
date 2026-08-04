"use client";

import { AdmitPatientModal } from "@/components/doctor/AdmitPatientModal";
import { DischargePatientModal } from "@/components/doctor/DischargePatientModal";
import { useEncounterUiStore } from "@/store/encounter-ui.store";

interface DispositionPanelProps {
  sessionId: string;
}

/**
 * Disposition for OP is collected in SaveConsultationDialog after save.
 * This panel keeps Admit / Discharge modals mounted so overlays close cleanly.
 */
export function DispositionPanel({ sessionId }: DispositionPanelProps) {
  const admitOpen = useEncounterUiStore((s) => s.admitModalOpen);
  const setAdmitOpen = useEncounterUiStore((s) => s.setAdmitModalOpen);
  const dischargeOpen = useEncounterUiStore((s) => s.dischargeModalOpen);
  const setDischargeOpen = useEncounterUiStore((s) => s.setDischargeModalOpen);

  return (
    <>
      <AdmitPatientModal
        sessionId={sessionId}
        open={admitOpen}
        onOpenChange={setAdmitOpen}
      />
      <DischargePatientModal
        sessionId={sessionId}
        open={dischargeOpen}
        onOpenChange={setDischargeOpen}
      />
    </>
  );
}
