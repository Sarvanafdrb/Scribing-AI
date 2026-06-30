import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { userKeys } from "@/services/user.queries";
import { useTenantScope } from "@/hooks/useTenantScope";

interface UseUsersParams {
  search?: string;
  isActive?: string;
  organizationId?: string;
  roleId?: string;
  page?: number;
  limit?: number;
}

export const useUsers = (params?: UseUsersParams) => {
  const { organizationId: scopedOrgId } = useTenantScope();
  const search = (params?.search || "").trim().replace(/\s+/g, " ");
  const isActive = params?.isActive || "";
  const organizationId = scopedOrgId || params?.organizationId || "";
  const roleId = params?.roleId || "";
  const page = params?.page || 1;
  const limit = params?.limit || 10;

  const query = useQuery({
    queryKey: userKeys.list({
      search,
      isActive,
      organizationId,
      roleId,
      page,
      limit,
    }),
    queryFn: () =>
      userService.getAll({
        search: search || undefined,
        isActive: isActive || undefined,
        organizationId: organizationId || undefined,
        roleId: roleId || undefined,
        page,
        limit,
      }),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    users: query.data?.users || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    limit: query.data?.limit || 10,
    totalPages: query.data?.totalPages || 1,
    activeCount: query.data?.activeCount || 0,
    inactiveCount: query.data?.inactiveCount || 0,
  };
};
