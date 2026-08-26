import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { aiNotesService } from "@/services/ai-notes.service";
import { aiNotesKeys } from "@/services/ai-notes.queries";
import { sessionKeys } from "@/services/session.queries";
import { useSession } from "@/hooks/sessions/useSession";
import { AiNotes } from "@/types/ai-notes.types";
import type { AiNotesExportContent } from "@/utils/ai-notes-export.utils";
import {
  exportContentToAiNotesUpdate,
  type AiNotesExportUpdateOptions,
} from "@/utils/ai-notes-export.utils";

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
  const hasSyncedCompletedStatus = useRef(false);
  const autoGenerateAttempted = useRef(false);
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
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiNotesKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: aiNotesKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      toast.error(
        error?.response?.data?.message || "Failed to generate AI Notes",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      content,
      options,
    }: {
      content: AiNotesExportContent;
      options?: AiNotesExportUpdateOptions;
    }) =>
      aiNotesService.update(
        sessionId,
        exportContentToAiNotesUpdate(content, options),
      ),
    onSuccess: (updatedNotes) => {
      queryClient.setQueryData(aiNotesKeys.detail(sessionId), updatedNotes);
      queryClient.setQueryData(sessionKeys.detail(sessionId), (current: any) =>
        current ? { ...current, aiNotes: updatedNotes } : current,
      );
      queryClient.invalidateQueries({ queryKey: aiNotesKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to save AI Notes changes",
      );
      throw error;
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
    autoGenerateAttempted.current = false;
    hasSyncedCompletedStatus.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!transcriptReady || autoGenerateAttempted.current) return;
    if (isCompleted || isProcessing || isFailed) return;
    if (generateMutation.isPending) return;

    autoGenerateAttempted.current = true;
    generateMutation.mutate(false);
  }, [
    generateMutation,
    isCompleted,
    isFailed,
    isProcessing,
    transcriptReady,
  ]);

  useEffect(() => {
    if (aiNotes?.status !== "completed" || hasSyncedCompletedStatus.current) {
      return;
    }
    hasSyncedCompletedStatus.current = true;
    queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
  }, [aiNotes?.status, queryClient, sessionId]);

  return {
    session,
    aiNotes,
    isLoading: isSessionLoading || (transcriptReady && aiNotesQuery.isLoading),
    isGenerating: generateMutation.isPending || isProcessing,
    isFailed,
    isCompleted,
    transcriptReady,
    generate: (force = false) => generateMutation.mutate(force),
    saveExportContent: (
      content: AiNotesExportContent,
      options?: AiNotesExportUpdateOptions,
    ) => updateMutation.mutateAsync({ content, options }),
    refetch: aiNotesQuery.refetch,
  };
};
