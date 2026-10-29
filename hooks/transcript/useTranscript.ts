import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { transcriptService } from "@/services/transcript.service";
import { transcriptKeys } from "@/services/transcript.queries";
import { useSession } from "@/hooks/sessions/useSession";
import { useActiveRecordingStore } from "@/store/active-recording.store";

/** If UI polls "processing" too long, re-hit generate so the API can recover orphaned jobs. */
const STUCK_REKICK_MS = 10 * 60 * 1000;

export const useTranscript = (sessionId: string) => {
  const sessionQuery = useSession(sessionId);
  const rekickedRef = useRef(false);

  const transcriptQuery = useQuery({
    queryKey: transcriptKeys.detail(sessionId),
    queryFn: () => transcriptService.get(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: (query) => {
      const status = query.state.data?.metadata.status;
      const sessionStatus = sessionQuery.data?.status;
      const recordingActive = useActiveRecordingStore.getState().isLocallyRecording;
      if (recordingActive) {
        return 2000;
      }
      if (
        status === "processing" ||
        sessionStatus === "processing" ||
        sessionStatus === "uploading"
      ) {
        return 2000;
      }
      return false;
    },
  });

  const isProcessing =
    sessionQuery.data?.status === "uploading" ||
    sessionQuery.data?.status === "processing" ||
    transcriptQuery.data?.metadata.status === "processing";

  useEffect(() => {
    if (!sessionId || !isProcessing) {
      rekickedRef.current = false;
      return;
    }

    const startedRaw =
      transcriptQuery.data?.metadata?.startedAt ??
      sessionQuery.data?.updatedAt;
    if (!startedRaw) {
      return;
    }

    const maybeRekick = () => {
      const ageMs = Date.now() - new Date(startedRaw).getTime();
      if (ageMs >= STUCK_REKICK_MS && !rekickedRef.current) {
        rekickedRef.current = true;
        void transcriptService.generate(sessionId).catch(() => {
          rekickedRef.current = false;
        });
      }
    };

    maybeRekick();
    const intervalId = window.setInterval(maybeRekick, 30_000);
    return () => window.clearInterval(intervalId);
  }, [
    sessionId,
    isProcessing,
    transcriptQuery.data?.metadata?.startedAt,
    sessionQuery.data?.updatedAt,
  ]);

  return {
    session: sessionQuery.data,
    transcript: transcriptQuery.data,
    isLoading: sessionQuery.isLoading || transcriptQuery.isLoading,
    isProcessing,
    error: sessionQuery.error || transcriptQuery.error,
    refetch: transcriptQuery.refetch,
  };
};
