import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import {
  canManageAllOrganizations,
  getUserOrganizationId,
  getUserOrganizationName,
  isSuperAdminUser,
} from "@/types/auth.types";

export const useTenantScope = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const selectedWorkspace = useWorkspaceStore((state) => state.selectedWorkspace);
  const isSuperAdmin = isSuperAdminUser(user, token);

  const organizationId = selectedWorkspace?.id
    ? selectedWorkspace.id
    : isSuperAdmin
      ? ""
      : getUserOrganizationId(user);

  const organizationName = selectedWorkspace?.name
    ? selectedWorkspace.name
    : isSuperAdmin
      ? ""
      : getUserOrganizationName(user);

  return {
    user,
    token,
    organizationId,
    organizationName,
    selectedWorkspace,
    isSuperAdmin,
    canManageAllOrganizations: canManageAllOrganizations(user, token),
  };
};
