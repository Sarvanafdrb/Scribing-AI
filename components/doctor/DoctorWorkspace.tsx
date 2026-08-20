"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/sessions/useSession";
import { DoctorSidebar } from "@/components/doctor/DoctorSidebar";
import { DoctorHeader } from "@/components/doctor/DoctorHeader";
import { DoctorPatientPanel } from "@/components/doctor/DoctorPatientPanel";
import { DoctorRecordingPanel } from "@/components/doctor/DoctorRecordingPanel";
import { DoctorLiveTranscript } from "@/components/doctor/DoctorLiveTranscript";
import { DoctorAiNotesPanel } from "@/components/doctor/DoctorAiNotesPanel";
import { DispositionPanel } from "@/components/doctor/DispositionPanel";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import { setLastDoctorWorkspaceSessionId } from "@/utils/doctorWorkspaceNavigation";

interface DoctorWorkspaceProps {
  sessionId: string;
}

export function DoctorWorkspace({ sessionId }: DoctorWorkspaceProps) {
  const { data: session, isLoading } = useSession(sessionId);
  const resetEncounterUi = useEncounterUiStore((s) => s.reset);
  const [recordingState, setRecordingState] = useState({
    isRecording: false,
    elapsedSeconds: 0,
  });

  // Never leak the previous consultation's timer / modal overlays.
  useEffect(() => {
    setLastDoctorWorkspaceSessionId(sessionId);
    setRecordingState({ isRecording: false, elapsedSeconds: 0 });
    resetEncounterUi();
    // Clear any leftover dialog scroll/pointer locks from a stuck overlay.
    document.body.style.removeProperty("pointer-events");
    document.body.style.removeProperty("overflow");
  }, [sessionId, resetEncounterUi]);

  const handleRecordingStateChange = useCallback(
    (state: { isRecording: boolean; elapsedSeconds: number }) => {
      setRecordingState(state);
    },
    [],
  );

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
    <div className="flex h-screen flex-col overflow-hidden bg-transparent">
      <div className="flex min-h-0 flex-1">
        <DoctorSidebar activeSessionId={sessionId} />

        <div className="flex min-w-0 flex-1 flex-col">
          <DoctorHeader
            sessionId={sessionId}
            elapsedSeconds={recordingState.elapsedSeconds}
            isRecording={recordingState.isRecording}
          />

          <main className="min-h-0 flex-1 overflow-hidden p-4">
            <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[280px_1fr_340px]">
              <div className="max-h-[min(42vh,440px)] overflow-y-auto xl:max-h-none">
                <DoctorPatientPanel sessionId={sessionId} />
              </div>

              <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                <DoctorRecordingPanel
                  key={sessionId}
                  sessionId={sessionId}
                  onRecordingStateChange={handleRecordingStateChange}
                />
                <DoctorLiveTranscript key={`transcript-${sessionId}`} sessionId={sessionId} />
              </div>

              <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
                <div className="min-h-0 flex-1 overflow-hidden">
                  <DoctorAiNotesPanel
                    key={`notes-${sessionId}`}
                    sessionId={sessionId}
                  />
                </div>
              </div>
            </div>
          </main>

          {/* Admit modal host — disposition is chosen after Save Consultation */}
          <DispositionPanel sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
