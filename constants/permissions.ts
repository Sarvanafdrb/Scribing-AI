export const PERMISSION_ACTIONS = [
  { id: "view", label: "View", suffix: "VIEW", legacyAction: "read" },
  { id: "create", label: "Create", suffix: "CREATE", legacyAction: "create" },
  { id: "edit", label: "Edit", suffix: "EDIT", legacyAction: "update" },
  { id: "delete", label: "Delete", suffix: "DELETE", legacyAction: "delete" },
] as const;

export const PERMISSION_MODULES = [
  { id: "organizations", label: "Organizations", prefix: "ORGANIZATION", legacySlug: "org" },
  { id: "users", label: "Users", prefix: "USER", legacySlug: "user" },
  { id: "roles", label: "Roles", prefix: "ROLE", legacySlug: "role" },
  { id: "permissions", label: "Permissions", prefix: "PERMISSION", legacySlug: "permission" },
  { id: "sessions", label: "Sessions", prefix: "SESSION", legacySlug: "session" },
  { id: "reports", label: "Reports", prefix: "REPORT", legacySlug: "report" },
  { id: "settings", label: "Settings", prefix: "SETTINGS", legacySlug: "settings" },
  { id: "recording", label: "Recording", prefix: "RECORDING", legacySlug: "recording" },
  { id: "transcript", label: "Transcript", prefix: "TRANSCRIPT", legacySlug: "transcript" },
  { id: "ai_notes", label: "AI Notes", prefix: "AI_NOTES", legacySlug: "ai_notes" },
  { id: "history", label: "History", prefix: "HISTORY", legacySlug: "history" },
] as const;

const buildLegacyCode = (legacySlug: string, legacyAction: string) =>
  `${legacySlug}:${legacyAction}`;

const aliasEntries: Array<[string, string]> = PERMISSION_MODULES.flatMap((module) =>
  PERMISSION_ACTIONS.map((action) => {
    const code = `${module.prefix}_${action.suffix}`;
    const legacy = buildLegacyCode(module.legacySlug, action.legacyAction);
    return [
      [code, code],
      [legacy, code],
    ] as Array<[string, string]>;
  }).flat(),
);

aliasEntries.push(["dashboard:read", "SETTINGS_VIEW"], ["report:read", "REPORT_VIEW"]);

export const PERMISSION_CODE_ALIASES = new Map<string, string>(aliasEntries);

export function normalizePermissionCode(code: string): string {
  return PERMISSION_CODE_ALIASES.get(code) || code;
}

export function hasPermissionCode(
  granted: string[],
  required: string,
): boolean {
  const normalizedRequired = normalizePermissionCode(required);
  return granted.some(
    (code) => normalizePermissionCode(code) === normalizedRequired,
  );
}

export const PERMISSION_VIEW = "PERMISSION_VIEW";
export const PERMISSION_EDIT = "PERMISSION_EDIT";
export const ROLE_EDIT = "ROLE_EDIT";

export const ORGANIZATION_VIEW = "ORGANIZATION_VIEW";
export const ORGANIZATION_CREATE = "ORGANIZATION_CREATE";
export const ORGANIZATION_EDIT = "ORGANIZATION_EDIT";
export const ORGANIZATION_DELETE = "ORGANIZATION_DELETE";

export const USER_VIEW = "USER_VIEW";
export const USER_CREATE = "USER_CREATE";
export const USER_EDIT = "USER_EDIT";
export const USER_DELETE = "USER_DELETE";

export function canManageAllUsersFromPermissions(
  permissions: string[],
  isSuperAdmin = false,
): boolean {
  if (isSuperAdmin) return true;
  return (
    hasPermissionCode(permissions, USER_CREATE) ||
    hasPermissionCode(permissions, "user:create")
  );
}
