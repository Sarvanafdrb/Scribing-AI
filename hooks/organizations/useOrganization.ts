// hooks/organizations/useOrganization.ts
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organization.service";
import { organizationKeys } from "@/services/organization.queries";

export const useOrganization = (id: string) => {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: () => organizationService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
