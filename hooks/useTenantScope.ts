import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import {
  canManageAllOrganizations,
  getUserOrganizationId,
  getUserOrganizationName,
  isSingleOrganizationStaffUser,
  isSuperAdminUser,
} from "@/types/auth.types";
import { isAllOrganizationsWorkspace } from "@/utils/workspace.utils";

export const useTenantScope = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const authHydrated = useAuthStore((state) => state._hasHydrated);
  const workspaceHydrated = useWorkspaceStore((state) => state._hasHydrated);
  const selectedWorkspace = useWorkspaceStore((state) => state.selectedWorkspace);
  const isSuperAdmin = isSuperAdminUser(user, token);
  const isSingleOrgStaff = isSingleOrganizationStaffUser(user);
  const isAllOrganizations = isSingleOrgStaff
    ? false
    : isAllOrganizationsWorkspace(selectedWorkspace);

  const userOrganizationId = getUserOrganizationId(user);

  const organizationId = isSingleOrgStaff
    ? userOrganizationId
    : selectedWorkspace && !isAllOrganizations
      ? selectedWorkspace.id
      : isSuperAdmin
        ? ""
        : userOrganizationId;

  const organizationName = isSingleOrgStaff
    ? getUserOrganizationName(user)
    : selectedWorkspace && !isAllOrganizations
      ? selectedWorkspace.name
      : isSuperAdmin
        ? isAllOrganizations
          ? "All Organizations"
          : ""
        : getUserOrganizationName(user);

  const isScopeReady =
    authHydrated &&
    workspaceHydrated &&
    (Boolean(organizationId) ||
      Boolean(selectedWorkspace) ||
      Boolean(userOrganizationId));

  return {
    user,
    token,
    organizationId,
    organizationName,
    selectedWorkspace,
    isSuperAdmin,
    isAllOrganizations,
    isSingleOrgStaff,
    canManageAllOrganizations: canManageAllOrganizations(user, token),
    isScopeReady,
    authHydrated,
    workspaceHydrated,
  };
};
