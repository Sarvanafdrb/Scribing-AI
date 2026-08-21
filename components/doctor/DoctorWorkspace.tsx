"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/sessions/useSession";
import { DoctorSidebar } from "@/components/doctor/DoctorSidebar";
import { DoctorHeader } from "@/components/doctor/DoctorHeader";
import { DoctorRecordingPanel } from "@/components/doctor/DoctorRecordingPanel";
import { DoctorLiveTranscript } from "@/components/doctor/DoctorLiveTranscript";
import { ConsultationRecordingSidebar } from "@/components/doctor/ConsultationRecordingSidebar";
import { DoctorAiNotesPanel } from "@/components/doctor/DoctorAiNotesPanel";
import { DispositionPanel } from "@/components/doctor/DispositionPanel";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import { useActiveRecordingStore } from "@/store/active-recording.store";
import { setLastDoctorWorkspaceSessionId } from "@/utils/doctorWorkspaceNavigation";
import { isTranscriptAvailable } from "@/utils/session-status.utils";

interface DoctorWorkspaceProps {
  sessionId: string;
}

export function DoctorWorkspace({ sessionId }: DoctorWorkspaceProps) {
  const { data: session, isLoading } = useSession(sessionId);
  const resetEncounterUi = useEncounterUiStore((s) => s.reset);
  const isLocallyRecording = useActiveRecordingStore(
    (state) =>
      state.isLocallyRecording && state.sessionId === sessionId,
  );
  const [recordingState, setRecordingState] = useState({
    isRecording: false,
    elapsedSeconds: 0,
  });

  useEffect(() => {
    setLastDoctorWorkspaceSessionId(sessionId);
    setRecordingState({ isRecording: false, elapsedSeconds: 0 });
    resetEncounterUi();
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

  const showRecordingLayout =
    isLocallyRecording ||
    recordingState.isRecording ||
    !isTranscriptAvailable(session.status);

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

          <main className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mx-auto flex h-full max-w-6xl flex-col gap-4">
              <DoctorRecordingPanel
                key={sessionId}
                sessionId={sessionId}
                onRecordingStateChange={handleRecordingStateChange}
              />

              {showRecordingLayout ? (
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                  <DoctorLiveTranscript
                    key={`transcript-${sessionId}`}
                    sessionId={sessionId}
                  />
                  <ConsultationRecordingSidebar sessionId={sessionId} />
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
                  <DoctorLiveTranscript
                    key={`transcript-${sessionId}`}
                    sessionId={sessionId}
                  />
                  <DoctorAiNotesPanel
                    key={`notes-${sessionId}`}
                    sessionId={sessionId}
                  />
                </div>
              )}
            </div>
          </main>

          <DispositionPanel sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
