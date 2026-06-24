import { useAuthStore } from "@/store/auth.store";
import {
  AuthUser,
  canManageAllOrganizations,
  getUserOrganizationId,
  hasAnyPermission,
  hasPermission,
  isSuperAdminUser,
} from "@/types/auth.types";
import {
  canManageAllUsersFromPermissions,
  ORGANIZATION_EDIT,
  ORGANIZATION_DELETE,
  USER_CREATE,
  USER_EDIT,
  USER_DELETE,
  USER_VIEW,
  ORGANIZATION_VIEW,
  ORGANIZATION_CREATE,
} from "@/constants/permissions";

const getCurrentUserId = (user?: AuthUser | null): string =>
  user?.id || user?._id || "";

export const useAccessControl = () => {
  const user = useAuthStore((state) => state.user) as AuthUser | null;
  const token = useAuthStore((state) => state.token);
  const isSuperAdmin = isSuperAdminUser(user, token);
  const currentUserId = getCurrentUserId(user);
  const canManageAllUsers =
    isSuperAdmin || canManageAllUsersFromPermissions(user?.permissions || []);

  return {
    user,
    currentUserId,
    isSuperAdmin,
    organizationId: isSuperAdmin ? "" : getUserOrganizationId(user),
    hasPermission: (permission: string) =>
      hasPermission(user, permission, token),
    hasAnyPermission: (permissions: string[]) =>
      hasAnyPermission(user, permissions, token),
    canManageOrganizations: canManageAllOrganizations(user, token),
    canCreateOrganization: () =>
      canManageAllOrganizations(user, token) ||
      hasPermission(user, ORGANIZATION_CREATE, token) ||
      hasPermission(user, "org:create", token),
    canViewOrganizations: () =>
      hasPermission(user, ORGANIZATION_VIEW, token) ||
      hasPermission(user, "org:read", token),
    canEditOrganization: () =>
      hasPermission(user, ORGANIZATION_EDIT, token) ||
      hasPermission(user, "org:update", token),
    canDeleteOrganization: () => canManageAllOrganizations(user, token),
    canViewUsers: () =>
      hasPermission(user, USER_VIEW, token) ||
      hasPermission(user, "user:read", token),
    canCreateUser: () =>
      hasPermission(user, USER_CREATE, token) ||
      hasPermission(user, "user:create", token),
    canManageAllUsers,
    canEditUser: (targetUserId?: string) => {
      const canEdit =
        hasPermission(user, USER_EDIT, token) ||
        hasPermission(user, "user:update", token);
      if (!canEdit) return false;
      if (isSuperAdmin || canManageAllUsers) return true;
      return Boolean(
        targetUserId && currentUserId && targetUserId === currentUserId,
      );
    },
    canManageUserStatus: (targetUserId?: string) => {
      if (!canManageAllUsers) return false;
      const canChange =
        hasPermission(user, USER_EDIT, token) ||
        hasPermission(user, USER_DELETE, token) ||
        hasPermission(user, "user:update", token) ||
        hasPermission(user, "user:delete", token);
      return canChange && Boolean(targetUserId);
    },
    canDeleteUser: (targetUserId?: string) => {
      if (!canManageAllUsers) return false;
      return (
        hasPermission(user, USER_DELETE, token) ||
        hasPermission(user, "user:delete", token)
      );
    },
  };
};
