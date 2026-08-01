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
import { DoctorWorkspaceFooter } from "@/components/doctor/DoctorWorkspaceFooter";
import { useEncounterUiStore } from "@/store/encounter-ui.store";

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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Session not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
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
              <div className="hidden overflow-y-auto xl:block">
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
                <div className="shrink-0 overflow-y-auto">
                  <DispositionPanel sessionId={sessionId} />
                </div>
              </div>
            </div>
          </main>

          <DoctorWorkspaceFooter sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
