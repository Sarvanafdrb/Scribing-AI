import { useQuery } from "@tanstack/react-query";
import { workspaceService } from "@/services/workspace.service";
import { workspaceKeys } from "@/services/workspace.queries";
import { useAuthStore } from "@/store/auth.store";

export const useWorkspaces = () => {
  const token = useAuthStore((state) => state.token);

  const query = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspaceService.getAll(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    workspaces: query.data || [],
  };
};
