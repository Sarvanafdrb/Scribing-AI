import { useQuery } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import { SessionStatus } from "@/types/session.types";

const POLLING_STATUSES: SessionStatus[] = [
  "uploading",
  "processing",
];

export const useSession = (id: string) => {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => sessionService.getById(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && POLLING_STATUSES.includes(status)) {
        return 2000;
      }
      return false;
    },
  });
};
