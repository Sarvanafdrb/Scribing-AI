import {
  canAccessDoctorWorkspace,
  canViewAdminPanel,
  hasPermissionCode,
} from "@/constants/permissions";
import {
  AuthUser,
  isDoctorUser,
  isNurseUser,
  isReceptionistUser,
  isSuperAdminUser,
} from "@/types/auth.types";

type OperationalHomeOptions = {
  /** When false, skip clinical workspace (Doctor role only). */
  includeDoctorWorkspace?: boolean;
};

/** First permitted operational route for non-admin staff. */
export function resolveOperationalHomePath(
  permissions: string[],
  isSuperAdmin = false,
  options?: OperationalHomeOptions,
): string | null {
  const includeDoctorWorkspace = options?.includeDoctorWorkspace ?? true;

  if (
    includeDoctorWorkspace &&
    canAccessDoctorWorkspace(permissions, isSuperAdmin)
  ) {
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
 * Only doctors go to Doctor Workspace; nurses and receptionists land on
 * their first permitted operational route (patients, sessions, etc.).
 */
export function resolveAuthenticatedHomePath(
  user?: AuthUser | null,
  token?: string | null,
): string {
  const permissions = user?.permissions || [];
  const isSuperAdmin = isSuperAdminUser(user, token);

  if (
    isDoctorUser(user) &&
    canAccessDoctorWorkspace(permissions, isSuperAdmin)
  ) {
    return "/doctor/workspace";
  }

  if (isNurseUser(user) || isReceptionistUser(user)) {
    const operational = resolveOperationalHomePath(permissions, isSuperAdmin, {
      includeDoctorWorkspace: false,
    });
    if (operational) {
      return operational;
    }
    return "/access-not-assigned";
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
