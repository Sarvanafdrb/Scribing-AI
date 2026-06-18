import { useQuery } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";

export const useSession = (id: string) => {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => sessionService.getById(id),
    enabled: Boolean(id),
  });
};
