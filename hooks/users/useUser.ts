import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { userKeys } from "@/services/user.queries";

export const useUser = (id: string) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
