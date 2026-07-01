import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { aiNotesService } from "@/services/ai-notes.service";
import { aiNotesKeys } from "@/services/ai-notes.queries";
import { sessionKeys } from "@/services/session.queries";
import { useSession } from "@/hooks/sessions/useSession";
import { AiNotes } from "@/types/ai-notes.types";

const hasTranscript = (session?: {
  transcript?: string;
  transcriptData?: { fullText?: string; metadata?: { status?: string } };
}) => {
  if (!session) return false;
  const status = session.transcriptData?.metadata?.status;
  if (status && status !== "completed") return false;
  return Boolean(
    session.transcriptData?.fullText?.trim() || session.transcript?.trim(),
  );
};

export const useAiNotes = (sessionId: string) => {
  const queryClient = useQueryClient();
  const hasRequestedGeneration = useRef(false);
  const { data: session, isLoading: isSessionLoading } = useSession(sessionId);

  const transcriptReady = hasTranscript(session);

  const aiNotesQuery = useQuery({
    queryKey: aiNotesKeys.detail(sessionId),
    queryFn: () => aiNotesService.get(sessionId),
    enabled: Boolean(sessionId) && transcriptReady,
    refetchInterval: (query) => {
      const status =
        query.state.data?.status || session?.aiNotes?.status;
      return status === "processing" ? 2000 : false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: (force?: boolean) =>
      aiNotesService.generate(sessionId, Boolean(force)),
    onSuccess: (data) => {
      queryClient.setQueryData(aiNotesKeys.detail(sessionId), data.aiNotes);
      queryClient.setQueryData(sessionKeys.detail(sessionId), data.session);
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: aiNotesKeys.detail(sessionId) });
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: aiNotesKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      toast.error(
        error?.response?.data?.message || "Failed to generate AI Notes",
      );
    },
  });

  const aiNotes = (aiNotesQuery.data ?? session?.aiNotes) as AiNotes | undefined;
  const isProcessing = aiNotes?.status === "processing";
  const isFailed = aiNotes?.status === "failed";
  const isCompleted =
    aiNotes?.status === "completed" &&
    Boolean(
      aiNotes.subjective ||
        aiNotes.objective ||
        aiNotes.assessment ||
        aiNotes.plan,
    );

  useEffect(() => {
    hasRequestedGeneration.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (
      !sessionId ||
      !transcriptReady ||
      isCompleted ||
      isProcessing ||
      isFailed ||
      hasRequestedGeneration.current
    ) {
      return;
    }

    if (!aiNotes) {
      hasRequestedGeneration.current = true;
      generateMutation.mutate(false);
    }
  }, [
    sessionId,
    transcriptReady,
    isCompleted,
    isProcessing,
    isFailed,
    aiNotes,
    generateMutation,
  ]);

  return {
    session,
    aiNotes,
    isLoading: isSessionLoading || (transcriptReady && aiNotesQuery.isLoading),
    isGenerating: generateMutation.isPending || isProcessing,
    isFailed,
    isCompleted,
    transcriptReady,
    generate: (force = false) => generateMutation.mutate(force),
    refetch: aiNotesQuery.refetch,
  };
};
