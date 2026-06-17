// hooks/organizations/useOrganizations.ts
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organization.service";
import { organizationKeys } from "@/services/organization.queries";

interface UseOrganizationsParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const useOrganizations = (params?: UseOrganizationsParams) => {
  const search = params?.search || "";
  const status = params?.status || "";
  const page = params?.page || 1;
  const limit = params?.limit || 10;

  const query = useQuery({
    queryKey: organizationKeys.list({ search, status, page, limit }),
    queryFn: () => organizationService.getAll({ search, status, page, limit }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...query,
    organizations: query.data?.organizations || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    limit: query.data?.limit || 10,
    totalPages: query.data?.totalPages || 1,
    activeCount: query.data?.activeCount || 0,
    inactiveCount: query.data?.inactiveCount || 0,
  };
};
