import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { transcriptService } from "@/services/transcript.service";
import { transcriptKeys } from "@/services/transcript.queries";
import { sessionKeys } from "@/services/session.queries";
import { UpdateTranscriptData } from "@/types/transcript.types";

export const useTranscriptMutations = (sessionId: string) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: transcriptKeys.detail(sessionId) });
    queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    queryClient.invalidateQueries({ queryKey: sessionKeys.stats() });
  };

  const generateTranscript = useMutation({
    mutationFn: () => transcriptService.generate(sessionId),
    onSuccess: () => {
      invalidate();
      toast.success("Transcript generation started");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to generate transcript",
      );
    },
  });

  const updateTranscript = useMutation({
    mutationFn: (data: UpdateTranscriptData) =>
      transcriptService.update(sessionId, data),
    onSuccess: () => {
      invalidate();
      toast.success("Transcript saved");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to save transcript",
      );
    },
  });

  const translateTranscript = useMutation({
    mutationFn: (targetLanguage: string) =>
      transcriptService.translate(sessionId, targetLanguage),
    onSuccess: () => {
      invalidate();
      toast.success("Transcript translated");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to translate transcript",
      );
    },
  });

  return {
    generateTranscript,
    updateTranscript,
    translateTranscript,
  };
};
