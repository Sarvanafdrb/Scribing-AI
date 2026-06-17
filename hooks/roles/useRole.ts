import { useQuery } from "@tanstack/react-query";
import { roleService } from "@/services/role.service";
import { roleKeys } from "@/services/role.queries";

export const useRole = (id: string) => {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => roleService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
