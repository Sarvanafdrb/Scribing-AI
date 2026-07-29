import { useQuery } from "@tanstack/react-query";
import { roleService } from "@/services/role.service";
import { roleKeys } from "@/services/role.queries";
import { useTenantScope } from "@/hooks/useTenantScope";

interface UseRolesParams {
  organizationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const useRoles = (params?: UseRolesParams) => {
  const { organizationId: scopedOrgId, isSuperAdmin } = useTenantScope();
  const organizationId = scopedOrgId || params?.organizationId || "";
  const search = params?.search || "";
  const page = params?.page || 1;
  const limit = params?.limit || 10;

  const query = useQuery({
    queryKey: roleKeys.list({ organizationId, search, page, limit }),
    queryFn: () =>
      roleService.getList({
        organizationId: organizationId || undefined,
        search: search || undefined,
        page,
        limit,
      }),
    enabled: !!organizationId || isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    roles: query.data?.roles || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    limit: query.data?.limit || 10,
    totalPages: query.data?.totalPages || 1,
    activeCount: query.data?.activeCount || 0,
    inactiveCount: query.data?.inactiveCount || 0,
  };
};

export const useRoleStats = () => {
  const { organizationId } = useTenantScope();

  return useQuery({
    queryKey: roleKeys.stats(organizationId),
    queryFn: () => roleService.getStats(),
    staleTime: 60 * 1000,
  });
};
