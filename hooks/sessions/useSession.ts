import { useQuery } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import {
  isPipelineActive,
  isReviewReady,
} from "@/utils/session-status.utils";

const PIPELINE_POLL_MS = 2000;

export const useSession = (id: string) => {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => sessionService.getById(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      const status = data?.status;
      const aiNotesStatus = data?.aiNotes?.status;

      if (isPipelineActive(status)) {
        return PIPELINE_POLL_MS;
      }

      if (status === "transcript_ready" || aiNotesStatus === "processing") {
        return PIPELINE_POLL_MS;
      }

      if (!isReviewReady(status) && aiNotesStatus === "completed") {
        return PIPELINE_POLL_MS;
      }

      return false;
    },
  });
};
