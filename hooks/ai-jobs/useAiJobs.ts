import { useQuery } from "@tanstack/react-query";
import { aiJobsKeys } from "@/services/ai-jobs.queries";
import { aiJobsService, hasActiveAiJob } from "@/services/ai-jobs.service";

export const useAiJobs = (sessionId: string, enabled = true) =>
  useQuery({
    queryKey: aiJobsKeys.session(sessionId),
    queryFn: () => aiJobsService.list(sessionId),
    enabled: Boolean(sessionId) && enabled,
    refetchInterval: (query) =>
      hasActiveAiJob(query.state.data) ? 2000 : false,
  });
