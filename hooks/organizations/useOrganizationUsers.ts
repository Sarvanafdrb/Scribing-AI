// hooks/organizations/useOrganizationUsers.ts
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organization.service";
import { organizationKeys } from "@/services/organization.queries";

export const useOrganizationUsers = (id: string) => {
  return useQuery({
    queryKey: organizationKeys.users(id),
    queryFn: () => organizationService.getUsers(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
