"use client";

import { AdmitPatientModal } from "@/components/doctor/AdmitPatientModal";
import { useEncounterUiStore } from "@/store/encounter-ui.store";

interface DispositionPanelProps {
  sessionId: string;
}

/**
 * Disposition for OP is collected in SaveConsultationDialog after save.
 * This panel only keeps the Admit modal mounted so overlays close cleanly.
 */
export function DispositionPanel({ sessionId }: DispositionPanelProps) {
  const admitOpen = useEncounterUiStore((s) => s.admitModalOpen);
  const setAdmitOpen = useEncounterUiStore((s) => s.setAdmitModalOpen);

  return (
    <AdmitPatientModal
      sessionId={sessionId}
      open={admitOpen}
      onOpenChange={setAdmitOpen}
    />
  );
}
