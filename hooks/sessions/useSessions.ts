import { useQuery } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import { useTenantScope } from "@/hooks/useTenantScope";

interface UseSessionsParams {
  search?: string;
  status?: string;
  sessionType?: string;
  organizationId?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

export const useSessions = (params?: UseSessionsParams) => {
  const { organizationId: scopedOrgId, isSuperAdmin } = useTenantScope();
  const search = params?.search || "";
  const status = params?.status || "";
  const sessionType = params?.sessionType || "";
  const organizationId = isSuperAdmin
    ? params?.organizationId || ""
    : scopedOrgId;
  const isActive = params?.isActive || "";
  const page = params?.page || 1;
  const limit = params?.limit || 10;

  const query = useQuery({
    queryKey: sessionKeys.list({
      search,
      status,
      sessionType,
      organizationId,
      isActive,
      page,
      limit,
    }),
    queryFn: () =>
      sessionService.getAll({
        search: search || undefined,
        status: status || undefined,
        sessionType: sessionType || undefined,
        organizationId: organizationId || undefined,
        isActive: isActive || undefined,
        page,
        limit,
      }),
    staleTime: 60 * 1000,
  });

  return {
    ...query,
    sessions: query.data?.sessions || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    limit: query.data?.limit || 10,
    totalPages: query.data?.totalPages || 1,
    activeCount: query.data?.activeCount || 0,
    inactiveCount: query.data?.inactiveCount || 0,
    statusCounts: query.data?.statusCounts || {
      created: 0,
      recording: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    },
  };
};

export const useSessionStats = () => {
  return useQuery({
    queryKey: sessionKeys.stats(),
    queryFn: () => sessionService.getStats(),
    staleTime: 60 * 1000,
  });
};
