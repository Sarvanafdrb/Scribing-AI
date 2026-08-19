import { AuthUser, hasPermission, isSuperAdminUser } from "@/types/auth.types";

type RoutePermissionRule = {
  pattern: RegExp;
  permission: string;
  message: string;
};

/** Most specific patterns first. Paths without a match are allowed for authenticated users. */
const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  {
    pattern: /^\/dashboard\/?$/,
    permission: "USER_VIEW",
    message: "You do not have permission to view the dashboard.",
  },
  {
    pattern: /^\/organizations\/create\/?$/,
    permission: "ORGANIZATION_CREATE",
    message: "You do not have permission to create organizations.",
  },
  {
    pattern: /^\/organizations\/edit\//,
    permission: "ORGANIZATION_EDIT",
    message: "You do not have permission to edit organizations.",
  },
  {
    pattern: /^\/organizations\/settings\//,
    permission: "ORGANIZATION_EDIT",
    message: "You do not have permission to manage organization settings.",
  },
  {
    pattern: /^\/organizations(\/|$)/,
    permission: "ORGANIZATION_VIEW",
    message: "You do not have permission to view organizations.",
  },
  {
    pattern: /^\/users\/invitations\/invite\/?$/,
    permission: "USER_CREATE",
    message: "You do not have permission to invite users.",
  },
  {
    pattern: /^\/users\/invitations\/?$/,
    permission: "USER_CREATE",
    message: "You do not have permission to view invitations.",
  },
  {
    pattern: /^\/users\/create\/?$/,
    permission: "USER_CREATE",
    message: "You do not have permission to create users.",
  },
  {
    pattern: /^\/users\/edit\//,
    permission: "USER_EDIT",
    message: "You do not have permission to edit users.",
  },
  {
    pattern: /^\/users(\/|$)/,
    permission: "USER_VIEW",
    message: "You do not have permission to view users.",
  },
  {
    pattern: /^\/departments\/create\/?$/,
    permission: "DEPARTMENT_CREATE",
    message: "You do not have permission to create departments.",
  },
  {
    pattern: /^\/departments\/edit\//,
    permission: "DEPARTMENT_EDIT",
    message: "You do not have permission to edit departments.",
  },
  {
    pattern: /^\/departments(\/|$)/,
    permission: "DEPARTMENT_VIEW",
    message: "You do not have permission to view departments.",
  },
  {
    pattern: /^\/reports\/?$/,
    permission: "REPORT_VIEW",
    message: "You do not have permission to view reports.",
  },
  {
    pattern: /^\/patients\/create\/?$/,
    permission: "PATIENT_CREATE",
    message: "You do not have permission to create patients.",
  },
  {
    pattern: /^\/patients\/edit\//,
    permission: "PATIENT_EDIT",
    message: "You do not have permission to edit patients.",
  },
  {
    pattern: /^\/patients(\/|$)/,
    permission: "PATIENT_VIEW",
    message: "You do not have permission to view patients.",
  },
  {
    pattern: /^\/medicines\/?$/,
    permission: "MEDICINE_VIEW",
    message: "You do not have permission to view medicines.",
  },
  {
    pattern: /^\/roles\/create\/?$/,
    permission: "ROLE_CREATE",
    message: "You do not have permission to create roles.",
  },
  {
    pattern: /^\/roles\/edit\//,
    permission: "ROLE_EDIT",
    message: "You do not have permission to edit roles.",
  },
  {
    pattern: /^\/roles(\/|$)/,
    permission: "ROLE_VIEW",
    message: "You do not have permission to view roles.",
  },
  {
    pattern: /^\/permissions\/?$/,
    permission: "PERMISSION_VIEW",
    message: "You do not have permission to view permissions.",
  },
  {
    pattern: /^\/sessions\/create\/?$/,
    permission: "SESSION_CREATE",
    message: "You do not have permission to create consultations.",
  },
  {
    pattern: /^\/sessions\/edit\//,
    permission: "SESSION_EDIT",
    message: "You do not have permission to edit consultations.",
  },
  {
    pattern: /^\/sessions\/[^/]+\/recording\/?$/,
    permission: "RECORDING_VIEW",
    message: "You do not have permission to view recordings.",
  },
  {
    pattern: /^\/sessions\/[^/]+\/transcript\/?$/,
    permission: "TRANSCRIPT_VIEW",
    message: "You do not have permission to view transcripts.",
  },
  {
    pattern: /^\/sessions\/[^/]+\/notes\/?$/,
    permission: "AI_NOTES_VIEW",
    message: "You do not have permission to view AI notes.",
  },
  {
    pattern: /^\/sessions(\/|$)/,
    permission: "SESSION_VIEW",
    message: "You do not have permission to view consultations.",
  },
  {
    pattern: /^\/appointments\/create\/?$/,
    permission: "APPOINTMENT_CREATE",
    message: "You do not have permission to schedule appointments.",
  },
  {
    pattern: /^\/appointments(\/|$)/,
    permission: "APPOINTMENT_VIEW",
    message: "You do not have permission to view appointments.",
  },
  {
    pattern: /^\/settings\/?$/,
    permission: "SETTINGS_VIEW",
    message: "You do not have permission to view settings.",
  },
];

const PUBLIC_ADMIN_PATHS = new Set(["/access-not-assigned"]);

export function getRoutePermissionRule(
  pathname: string,
): RoutePermissionRule | null {
  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return null;
  }

  return (
    ROUTE_PERMISSION_RULES.find((rule) => rule.pattern.test(pathname)) || null
  );
}

export function resolveRouteAccess(
  pathname: string,
  user?: AuthUser | null,
  token?: string | null,
): { allowed: boolean; message?: string } {
  if (isSuperAdminUser(user, token)) {
    return { allowed: true };
  }

  const rule = getRoutePermissionRule(pathname);
  if (!rule) {
    return { allowed: true };
  }

  if (hasPermission(user, rule.permission, token)) {
    return { allowed: true };
  }

  return { allowed: false, message: rule.message };
}
