import { useQuery } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import { useTenantScope } from "@/hooks/useTenantScope";

interface UseSessionsParams {
  search?: string;
  status?: string;
  sessionType?: string;
  organizationId?: string;
  patientId?: string;
  userId?: string;
  isActive?: string;
  today?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export const useSessions = (params?: UseSessionsParams) => {
  const { organizationId: scopedOrgId } = useTenantScope();
  const search = params?.search || "";
  const status = params?.status || "";
  const sessionType = params?.sessionType || "";
  const organizationId = params?.organizationId || scopedOrgId || "";
  const patientId = params?.patientId || "";
  const userId = params?.userId || "";
  const isActive = params?.isActive || "";
  const today = params?.today || "";
  const dateFrom = params?.dateFrom || "";
  const dateTo = params?.dateTo || "";
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const enabled = params?.enabled !== false;

  const query = useQuery({
    queryKey: sessionKeys.list({
      search,
      status,
      sessionType,
      organizationId,
      patientId,
      userId,
      isActive,
      today,
      dateFrom,
      dateTo,
      page,
      limit,
    }),
    queryFn: () =>
      sessionService.getAll({
        search: search || undefined,
        status: status || undefined,
        sessionType: sessionType || undefined,
        organizationId: organizationId || undefined,
        patientId: patientId || undefined,
        userId: userId || undefined,
        isActive: isActive || undefined,
        today: today || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit,
      }),
    enabled,
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
      uploading: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    },
  };
};

export const useSessionStats = () => {
  const { organizationId } = useTenantScope();

  return useQuery({
    queryKey: sessionKeys.stats(organizationId),
    queryFn: () => sessionService.getStats(),
    staleTime: 60 * 1000,
  });
};
