import {
  canAccessDoctorWorkspace,
  canViewAdminPanel,
} from "@/constants/permissions";
import { AuthUser, isDoctorUser, isSuperAdminUser } from "@/types/auth.types";

/**
 * Single source of truth for where an authenticated user should land.
 * Uses existing permission helpers; clinical doctors are routed to Doctor
 * Workspace before the admin panel when they have clinical access.
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

  if (canViewAdminPanel(permissions, isSuperAdmin)) {
    return "/dashboard";
  }

  if (canAccessDoctorWorkspace(permissions, isSuperAdmin)) {
    return "/doctor/workspace";
  }

  return "/access-not-assigned";
}
