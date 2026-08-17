import { useQuery } from "@tanstack/react-query";
import { invitationService } from "@/services/invitation.service";
import { invitationKeys } from "@/services/invitation.queries";
import { useTenantScope } from "@/hooks/useTenantScope";

interface UseInvitationsParams {
  search?: string;
  status?: string;
  organizationId?: string;
  roleId?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export const useInvitations = (params?: UseInvitationsParams) => {
  const { organizationId: scopedOrgId } = useTenantScope();
  const search = (params?.search || "").trim().replace(/\s+/g, " ");
  const status = params?.status && params.status !== "all" ? params.status : "";
  const organizationId = params?.organizationId || scopedOrgId || "";
  const roleId = params?.roleId && params.roleId !== "all" ? params.roleId : "";
  const departmentId =
    params?.departmentId && params.departmentId !== "all"
      ? params.departmentId
      : "";
  const page = params?.page || 1;
  const limit = params?.limit || 10;

  const query = useQuery({
    queryKey: invitationKeys.list({
      search,
      status,
      organizationId,
      roleId,
      departmentId,
      page,
      limit,
    }),
    queryFn: () =>
      invitationService.getAll({
        search: search || undefined,
        status: status || undefined,
        organizationId: organizationId || undefined,
        roleId: roleId || undefined,
        departmentId: departmentId || undefined,
        page,
        limit,
      }),
    enabled: params?.enabled ?? true,
    staleTime: 60 * 1000,
  });

  return {
    ...query,
    invitations: query.data?.invitations || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    limit: query.data?.limit || 10,
    totalPages: query.data?.totalPages || 1,
  };
};
