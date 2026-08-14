import { useQuery } from "@tanstack/react-query";
import { departmentService } from "@/services/department.service";
import { departmentKeys } from "@/services/department.queries";

export const useDepartment = (id: string) => {
  return useQuery({
    queryKey: departmentKeys.detail(id),
    queryFn: () => departmentService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
