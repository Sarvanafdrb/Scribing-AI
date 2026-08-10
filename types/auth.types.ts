import { decodeAccessToken } from "@/utils/token";
import { hasPermissionCode } from "@/constants/permissions";

const isDataUrl = (value?: string | null) =>
  Boolean(value && value.startsWith("data:"));

const isSafeMediaUrl = (value?: string | null) => {
  if (!value) return false;
  return (
    value.startsWith("/uploads/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
};

/** Strip Base64 / unsafe media payloads before persisting auth state. */
export const sanitizeMediaUrl = (value?: string | null): string => {
  if (!value) return "";
  if (isDataUrl(value)) return "";
  if (isSafeMediaUrl(value)) return value;
  return "";
};

export interface AuthOrganization {
  id?: string;
  _id?: string;
  name: string;
  organizationCode?: string;
  logo?: string;
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
  phone?: string;
  profilePicture?: string;
  signature?: string;
  qualification?: string;
  isSuperAdmin?: boolean;
  organizationId?: string;
  organizationName?: string;
  organization?: AuthOrganization | null;
  role?: AuthRole | null;
  roleName?: string;
  permissions?: string[];
}

type AuthUserInput = {
  id?: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  signature?: string;
  qualification?: string;
  isSuperAdmin?: boolean;
  organizationId?: string;
  organizationName?: string;
  organization?: AuthOrganization | null;
  role?: AuthRole | string | null;
  roleName?: string;
  permissions?: string[];
};

export const normalizeAuthUser = (user: AuthUserInput): AuthUser => {
  const role: AuthRole | null =
    user.role && typeof user.role === "object"
      ? {
          id: user.role.id || user.role._id,
          _id: user.role._id || user.role.id,
          name: user.role.name,
        }
      : user.roleName || (typeof user.role === "string" ? user.role : undefined)
        ? { name: user.roleName || (user.role as string) }
        : null;

  const organizationId =
    user.organizationId ||
    user.organization?.id ||
    user.organization?._id ||
    "";

  const organizationLogo = sanitizeMediaUrl(user.organization?.logo);

  const organization: AuthOrganization | null = user.isSuperAdmin
    ? null
    : user.organization
      ? {
          id: organizationId || user.organization.id || user.organization._id,
          _id: organizationId || user.organization._id || user.organization.id,
          name: user.organization.name,
          organizationCode: user.organization.organizationCode,
          logo: organizationLogo,
        }
      : null;

  return {
    id: user.id || user._id || "",
    _id: user._id || user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || "",
    profilePicture: sanitizeMediaUrl(user.profilePicture),
    signature: sanitizeMediaUrl(user.signature),
    qualification: user.qualification || "",
    isSuperAdmin: Boolean(user.isSuperAdmin),
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    organizationId: organizationId || undefined,
    organizationName: user.organizationName || user.organization?.name,
    organization,
    role,
    roleName:
      user.roleName ||
      (typeof user.role === "string" ? user.role : user.role?.name),
  };
};

export const getUserOrganizationId = (user?: AuthUser | null): string => {
  if (!user) return "";

  if (user.organizationId) return user.organizationId;

  if (user.organization) {
    const org = user.organization;
    return org.id || org._id || "";
  }

  return "";
};

export const getUserOrganizationName = (user?: AuthUser | null): string => {
  if (!user) return "";
  return user.organizationName || user.organization?.name || "";
};

/** Minimal snapshot persisted to localStorage — never includes Base64 blobs. */
export const toPersistedAuthUser = (user: AuthUser | null): AuthUser | null => {
  if (!user) return null;

  const normalized = normalizeAuthUser(user);
  const organizationId =
    normalized.organizationId || getUserOrganizationId(normalized);

  return {
    id: normalized.id,
    firstName: normalized.firstName,
    lastName: normalized.lastName,
    email: normalized.email,
    isSuperAdmin: normalized.isSuperAdmin,
    organizationId: organizationId || undefined,
    organizationName: normalized.organizationName,
    organization: normalized.organization
      ? {
          id: organizationId || normalized.organization.id,
          name: normalized.organization.name,
          logo: sanitizeMediaUrl(normalized.organization.logo),
        }
      : organizationId
        ? {
            id: organizationId,
            name: normalized.organizationName || "",
            logo: "",
          }
        : null,
    role: normalized.role
      ? {
          id: normalized.role.id || normalized.role._id,
          name: normalized.role.name,
        }
      : null,
    roleName: normalized.roleName,
    permissions: normalized.permissions || [],
    profilePicture: sanitizeMediaUrl(normalized.profilePicture),
    signature: sanitizeMediaUrl(normalized.signature),
  };
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

export const getUserRoleName = (user?: AuthUser | null): string =>
  (user?.roleName || user?.role?.name || "").trim();

/** True when the user's role name is Doctor (case-insensitive). Super Admin is never a doctor. */
export const isDoctorUser = (user?: AuthUser | null): boolean => {
  if (!user || user.isSuperAdmin) return false;
  return getUserRoleName(user).toLowerCase() === "doctor";
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
