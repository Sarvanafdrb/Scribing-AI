import { useQuery } from "@tanstack/react-query";
import { departmentService } from "@/services/department.service";
import { departmentKeys } from "@/services/department.queries";
import { useTenantScope } from "@/hooks/useTenantScope";

interface UseDepartmentsParams {
  search?: string;
  isActive?: string;
  organizationId?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export const useDepartments = (params?: UseDepartmentsParams) => {
  const { organizationId: scopedOrgId, isSuperAdmin } = useTenantScope();
  const search = params?.search || "";
  const isActive = params?.isActive || "";
  const requestedOrgId = params?.organizationId ?? scopedOrgId ?? "";
  const organizationId =
    !requestedOrgId || requestedOrgId.toLowerCase() === "all"
      ? ""
      : requestedOrgId;
  const page = params?.page || 1;
  const limit = params?.limit || 10;

  const query = useQuery({
    queryKey: departmentKeys.list({
      search,
      isActive,
      organizationId,
      page,
      limit,
    }),
    queryFn: () =>
      departmentService.getAll({
        search: search || undefined,
        isActive: isActive || undefined,
        organizationId: organizationId || undefined,
        page,
        limit,
      }),
    enabled: (params?.enabled ?? true) && (!!organizationId || isSuperAdmin),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    departments: query.data?.departments || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    limit: query.data?.limit || 10,
    totalPages: query.data?.totalPages || 1,
    activeCount: query.data?.activeCount || 0,
    inactiveCount: query.data?.inactiveCount || 0,
  };
};
