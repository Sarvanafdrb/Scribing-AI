"use client";

import { useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/sessions/useSession";
import { DoctorTopBar } from "@/components/doctor/DoctorTopBar";
import { DoctorSidebar } from "@/components/doctor/DoctorSidebar";
import { DoctorRecordingPanel } from "@/components/doctor/DoctorRecordingPanel";
import { DoctorLiveTranscript } from "@/components/doctor/DoctorLiveTranscript";
import { ConsultationRecordingSidebar } from "@/components/doctor/ConsultationRecordingSidebar";
import { ClinicalNoteReviewView } from "@/components/doctor/ClinicalNoteReviewView";
import { PrescriptionReviewView } from "@/components/doctor/PrescriptionReviewView";
import { PrescriptionPreviewView } from "@/components/doctor/PrescriptionPreviewView";
import { DoctorWorkspaceModals } from "@/components/doctor/DoctorWorkspaceModals";
import { DispositionPanel } from "@/components/doctor/DispositionPanel";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import { useActiveRecordingStore } from "@/store/active-recording.store";
import { setLastDoctorWorkspaceSessionId } from "@/utils/doctorWorkspaceNavigation";

interface DoctorWorkspaceProps {
  sessionId: string;
}

export function DoctorWorkspace({ sessionId }: DoctorWorkspaceProps) {
  const { data: session, isLoading } = useSession(sessionId);
  const resetEncounterUi = useEncounterUiStore((s) => s.reset);
  const clinicalReviewRequested = useEncounterUiStore(
    (s) => s.clinicalReviewRequested,
  );
  const prescriptionReviewRequested = useEncounterUiStore(
    (s) => s.prescriptionReviewRequested,
  );
  const prescriptionPreviewPayload = useEncounterUiStore(
    (s) => s.prescriptionPreviewPayload,
  );
  const isLocallyRecording = useActiveRecordingStore(
    (state) =>
      state.isLocallyRecording && state.sessionId === sessionId,
  );
  const handleRecordingStateChange = useCallback(() => {}, []);

  useEffect(() => {
    setLastDoctorWorkspaceSessionId(sessionId);
    resetEncounterUi();
    document.body.style.removeProperty("pointer-events");
    document.body.style.removeProperty("overflow");
  }, [sessionId, resetEncounterUi]);

  const showPrescriptionPreview = Boolean(prescriptionPreviewPayload);
  const showPrescriptionReview =
    prescriptionReviewRequested && !showPrescriptionPreview;
  const showClinicalNote =
    clinicalReviewRequested && !showPrescriptionReview && !showPrescriptionPreview;

  if (isLoading && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <DoctorTopBar />

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <DoctorSidebar activeSessionId={sessionId} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
            <div className="mx-auto flex h-full w-full min-w-0 max-w-6xl flex-col gap-4">
              {showPrescriptionPreview && prescriptionPreviewPayload ? (
                <PrescriptionPreviewView
                  sessionId={sessionId}
                  payload={prescriptionPreviewPayload}
                />
              ) : showPrescriptionReview ? (
                <PrescriptionReviewView sessionId={sessionId} />
              ) : showClinicalNote ? (
                <ClinicalNoteReviewView sessionId={sessionId} />
              ) : (
                <>
                  <DoctorRecordingPanel
                    key={sessionId}
                    sessionId={sessionId}
                    onRecordingStateChange={handleRecordingStateChange}
                  />
                  <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                    <DoctorLiveTranscript
                      key={`transcript-${sessionId}`}
                      sessionId={sessionId}
                    />
                    <ConsultationRecordingSidebar sessionId={sessionId} />
                  </div>
                </>
              )}
            </div>
          </main>

          <DispositionPanel sessionId={sessionId} />
        </div>
      </div>

      <DoctorWorkspaceModals sessionId={sessionId} />
    </div>
  );
}
