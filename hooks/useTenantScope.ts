import { useAuthStore } from "@/store/auth.store";
import {
  canManageAllOrganizations,
  getUserOrganizationId,
  getUserOrganizationName,
  isSuperAdminUser,
} from "@/types/auth.types";

export const useTenantScope = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isSuperAdmin = isSuperAdminUser(user, token);

  return {
    user,
    token,
    organizationId: isSuperAdmin ? "" : getUserOrganizationId(user),
    organizationName: isSuperAdmin ? "" : getUserOrganizationName(user),
    isSuperAdmin,
    canManageAllOrganizations: canManageAllOrganizations(user, token),
  };
};
