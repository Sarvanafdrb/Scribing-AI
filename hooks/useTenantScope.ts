import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import {
  canManageAllOrganizations,
  getUserOrganizationId,
  getUserOrganizationName,
  isSuperAdminUser,
} from "@/types/auth.types";
import { isAllOrganizationsWorkspace } from "@/utils/workspace.utils";

export const useTenantScope = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const selectedWorkspace = useWorkspaceStore((state) => state.selectedWorkspace);
  const isSuperAdmin = isSuperAdminUser(user, token);
  const isAllOrganizations = isAllOrganizationsWorkspace(selectedWorkspace);

  const organizationId =
    selectedWorkspace && !isAllOrganizations
      ? selectedWorkspace.id
      : isSuperAdmin
        ? ""
        : getUserOrganizationId(user);

  const organizationName =
    selectedWorkspace && !isAllOrganizations
      ? selectedWorkspace.name
      : isSuperAdmin
        ? isAllOrganizations
          ? "All Organizations"
          : ""
        : getUserOrganizationName(user);

  return {
    user,
    token,
    organizationId,
    organizationName,
    selectedWorkspace,
    isSuperAdmin,
    isAllOrganizations,
    canManageAllOrganizations: canManageAllOrganizations(user, token),
  };
};
