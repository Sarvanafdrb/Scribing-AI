import { api } from "@/services/api";
import type { AiJob } from "@/types/ai-job.types";

export const aiJobsService = {
  list: async (sessionId: string): Promise<AiJob[]> => {
    const response = await api.get(`/sessions/${sessionId}/ai-jobs`);
    return response.data.data || [];
  },
};

export const hasActiveAiJob = (
  jobs: AiJob[] | undefined,
  operationType?: AiJob["operationType"],
): boolean =>
  Boolean(
    jobs?.some(
      (job) =>
        (job.status === "queued" || job.status === "processing") &&
        (!operationType || job.operationType === operationType),
    ),
  );
