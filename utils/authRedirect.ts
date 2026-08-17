import {
  canAccessDoctorWorkspace,
  canViewAdminPanel,
  hasPermissionCode,
} from "@/constants/permissions";
import {
  AuthUser,
  isClinicalRoleUser,
  isReceptionistUser,
  isSuperAdminUser,
} from "@/types/auth.types";

/** First permitted operational route for non-admin staff. */
export function resolveOperationalHomePath(
  permissions: string[],
  isSuperAdmin = false,
): string | null {
  if (canAccessDoctorWorkspace(permissions, isSuperAdmin)) {
    return "/doctor/workspace";
  }

  if (hasPermissionCode(permissions, "PATIENT_VIEW")) {
    return "/patients";
  }

  if (hasPermissionCode(permissions, "SESSION_VIEW")) {
    return "/sessions";
  }

  if (hasPermissionCode(permissions, "REPORT_VIEW")) {
    return "/reports";
  }

  return null;
}

/**
 * Single source of truth for where an authenticated user should land.
 * Uses existing permission helpers; clinical role names route to Doctor
 * Workspace before the admin panel when they have clinical access.
 */
export function resolveAuthenticatedHomePath(
  user?: AuthUser | null,
  token?: string | null,
): string {
  const permissions = user?.permissions || [];
  const isSuperAdmin = isSuperAdminUser(user, token);

  if (
    isClinicalRoleUser(user) &&
    canAccessDoctorWorkspace(permissions, isSuperAdmin)
  ) {
    return "/doctor/workspace";
  }

  if (isReceptionistUser(user)) {
    const operational = resolveOperationalHomePath(permissions, isSuperAdmin);
    if (operational && operational !== "/doctor/workspace") {
      return operational;
    }
  }

  if (canViewAdminPanel(permissions, isSuperAdmin)) {
    return "/dashboard";
  }

  if (canAccessDoctorWorkspace(permissions, isSuperAdmin)) {
    return "/doctor/workspace";
  }

  const operational = resolveOperationalHomePath(permissions, isSuperAdmin);
  if (operational) {
    return operational;
  }

  return "/access-not-assigned";
}
