import { useQuery } from "@tanstack/react-query";
import { patientService } from "@/services/patient.service";
import { patientKeys } from "@/services/patient.queries";
import { useTenantScope } from "@/hooks/useTenantScope";

export const usePatients = (params?: {
  search?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}) => {
  const { organizationId, isSuperAdmin } = useTenantScope();
  const search = (params?.search || "").trim().replace(/\s+/g, " ");

  const query = useQuery({
    queryKey: patientKeys.list({
      ...params,
      search,
      organizationId: organizationId || "all",
    }),
    queryFn: () =>
      patientService.getAll({
        ...params,
        search: search || undefined,
        organizationId: organizationId || undefined,
        isActive: params?.isActive,
      }),
    enabled: Boolean(organizationId) || isSuperAdmin,
  });

  return {
    patients: query.data?.patients || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    limit: query.data?.limit || 5,
    totalPages: query.data?.totalPages || 1,
    activeCount: query.data?.activeCount || 0,
    inactiveCount: query.data?.inactiveCount || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

export const usePatient = (id: string) => {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => patientService.getById(id),
    enabled: Boolean(id),
  });
};
