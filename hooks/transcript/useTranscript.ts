import { useQuery } from "@tanstack/react-query";
import { transcriptService } from "@/services/transcript.service";
import { transcriptKeys } from "@/services/transcript.queries";
import { useSession } from "@/hooks/sessions/useSession";

export const useTranscript = (sessionId: string) => {
  const sessionQuery = useSession(sessionId);

  const transcriptQuery = useQuery({
    queryKey: transcriptKeys.detail(sessionId),
    queryFn: () => transcriptService.get(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: (query) => {
      const status = query.state.data?.metadata.status;
      const sessionStatus = sessionQuery.data?.status;
      if (status === "processing" || sessionStatus === "processing") {
        return 3000;
      }
      return false;
    },
  });

  const isProcessing =
    sessionQuery.data?.status === "processing" ||
    transcriptQuery.data?.metadata.status === "processing";

  return {
    session: sessionQuery.data,
    transcript: transcriptQuery.data,
    isLoading: sessionQuery.isLoading || transcriptQuery.isLoading,
    isProcessing,
    error: sessionQuery.error || transcriptQuery.error,
    refetch: transcriptQuery.refetch,
  };
};
