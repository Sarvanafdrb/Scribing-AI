import { decodeAccessToken } from "@/utils/token";
import { hasPermissionCode } from "@/constants/permissions";

export interface AuthOrganization {
  id?: string;
  _id?: string;
  name: string;
  organizationCode?: string;
}

export interface AuthRole {
  id?: string;
  _id?: string;
  name: string;
}

export interface AuthUser {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  isSuperAdmin?: boolean;
  organizationName?: string;
  organization?: AuthOrganization | null;
  role?: AuthRole | null;
  roleName?: string;
  permissions?: string[];
}

export const getUserOrganizationId = (user?: AuthUser | null): string => {
  if (!user) return "";

  if (user.organization) {
    const org = user.organization;
    return org.id || org._id || "";
  }

  const rawOrgId = (user as AuthUser & { organizationId?: unknown })
    .organizationId;

  if (typeof rawOrgId === "string") return rawOrgId;
  if (rawOrgId && typeof rawOrgId === "object") {
    const org = rawOrgId as AuthOrganization;
    return org.id || org._id || "";
  }

  return "";
};

export const getUserOrganizationName = (user?: AuthUser | null): string => {
  if (!user) return "";
  return user.organizationName || user.organization?.name || "";
};

export const isSuperAdminUser = (
  user?: AuthUser | null,
  token?: string | null,
): boolean => {
  if (user?.isSuperAdmin) return true;
  if (user?.roleName === "super_admin") return true;
  if (user?.permissions?.includes("org:create")) return true;
  if (hasPermissionCode(user?.permissions || [], "ORGANIZATION_CREATE")) return true;

  const tokenPayload = decodeAccessToken(token);
  return Boolean(tokenPayload?.isSuperAdmin);
};

export const canManageAllOrganizations = (
  user?: AuthUser | null,
  token?: string | null,
): boolean => isSuperAdminUser(user, token);

export const hasPermission = (
  user: AuthUser | null | undefined,
  permission: string,
  token?: string | null,
): boolean => {
  if (!user) return false;
  if (isSuperAdminUser(user, token)) return true;
  return hasPermissionCode(user.permissions || [], permission);
};

export const hasAnyPermission = (
  user: AuthUser | null | undefined,
  permissions: string[],
  token?: string | null,
): boolean =>
  permissions.some((permission) => hasPermission(user, permission, token));
