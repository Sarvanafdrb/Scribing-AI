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
  canAccessDoctorWorkspace,
  canViewAdminPanel,
  ORGANIZATION_EDIT,
  ORGANIZATION_DELETE,
  USER_CREATE,
  USER_EDIT,
  USER_DELETE,
  USER_VIEW,
  ORGANIZATION_VIEW,
  ORGANIZATION_CREATE,
  hasPermissionCode,
  DEPARTMENT_VIEW,
  DEPARTMENT_CREATE,
  DEPARTMENT_EDIT,
  DEPARTMENT_DELETE,
  PATIENT_VIEW,
  PATIENT_CREATE,
  PATIENT_EDIT,
  PATIENT_DELETE,
  ROLE_EDIT,
  ROLE_VIEW,
  ROLE_CREATE,
  ROLE_DELETE,
  PERMISSION_VIEW,
  PERMISSION_EDIT,
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
    canViewReports: () =>
      hasPermission(user, "REPORT_VIEW", token) ||
      hasPermission(user, "report:read", token) ||
      hasPermissionCode(user?.permissions || [], "REPORT_VIEW"),
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
    canViewDepartments: () =>
      hasPermission(user, DEPARTMENT_VIEW, token) ||
      hasPermission(user, "department:read", token),
    canCreateDepartment: () =>
      hasPermission(user, DEPARTMENT_CREATE, token) ||
      hasPermission(user, "department:create", token),
    canEditDepartment: () =>
      hasPermission(user, DEPARTMENT_EDIT, token) ||
      hasPermission(user, "department:update", token),
    canDeactivateDepartment: () =>
      hasPermission(user, DEPARTMENT_DELETE, token) ||
      hasPermission(user, "department:delete", token),
    canViewPatients: () =>
      hasPermission(user, PATIENT_VIEW, token) ||
      hasPermission(user, "patient:read", token),
    canCreatePatient: () =>
      hasPermission(user, PATIENT_CREATE, token) ||
      hasPermission(user, "patient:create", token),
    canEditPatient: () =>
      hasPermission(user, PATIENT_EDIT, token) ||
      hasPermission(user, "patient:update", token),
    canManagePatientStatus: () =>
      hasPermission(user, PATIENT_EDIT, token) ||
      hasPermission(user, PATIENT_DELETE, token) ||
      hasPermission(user, "patient:update", token) ||
      hasPermission(user, "patient:delete", token),
    canEditRole: () =>
      hasPermission(user, ROLE_EDIT, token) ||
      hasPermission(user, "role:update", token),
    canViewRoles: () =>
      hasPermission(user, ROLE_VIEW, token) ||
      hasPermission(user, "role:read", token),
    canCreateRole: () =>
      hasPermission(user, ROLE_CREATE, token) ||
      hasPermission(user, "role:create", token),
    canManageRoleStatus: () =>
      hasPermission(user, ROLE_DELETE, token) ||
      hasPermission(user, ROLE_EDIT, token) ||
      hasPermission(user, "role:delete", token) ||
      hasPermission(user, "role:update", token),
    canViewPermissions: () =>
      hasPermission(user, PERMISSION_VIEW, token) ||
      hasPermission(user, "permission:read", token),
    canEditPermissions: () =>
      hasPermission(user, PERMISSION_EDIT, token) ||
      hasPermission(user, "permission:update", token),
    canViewDashboard: () =>
      hasPermission(user, USER_VIEW, token) ||
      hasPermission(user, "user:read", token) ||
      canViewAdminPanel(user?.permissions || [], isSuperAdmin),
    canAccessDoctorWorkspace: () =>
      canAccessDoctorWorkspace(user?.permissions || [], isSuperAdmin),
    canViewAdminPanel: () =>
      canViewAdminPanel(user?.permissions || [], isSuperAdmin),
    canViewSessions: () =>
      hasPermission(user, "SESSION_VIEW", token) ||
      hasPermission(user, "session:read", token),
    canCreateSession: () =>
      hasPermission(user, "SESSION_CREATE", token) ||
      hasPermission(user, "session:create", token),
    canEditSession: () =>
      hasPermission(user, "SESSION_EDIT", token) ||
      hasPermission(user, "session:update", token),
    canDeleteSession: () =>
      hasPermission(user, "SESSION_DELETE", token) ||
      hasPermission(user, "session:delete", token),
    canManageSessionStatus: () =>
      hasPermission(user, "SESSION_EDIT", token) ||
      hasPermission(user, "session:update", token),
    canCreateRecording: () =>
      hasPermission(user, "RECORDING_CREATE", token) ||
      hasPermission(user, "recording:create", token),
    canViewRecording: () =>
      hasPermission(user, "RECORDING_VIEW", token) ||
      hasPermission(user, "recording:read", token),
    canEditRecording: () =>
      hasPermission(user, "RECORDING_EDIT", token) ||
      hasPermission(user, "recording:update", token),
    canViewTranscript: () =>
      hasPermission(user, "TRANSCRIPT_VIEW", token) ||
      hasPermission(user, "transcript:read", token),
    canEditTranscript: () =>
      hasPermission(user, "TRANSCRIPT_EDIT", token) ||
      hasPermission(user, "transcript:update", token),
    canViewAiNotes: () =>
      hasPermission(user, "AI_NOTES_VIEW", token) ||
      hasPermission(user, "ai_notes:read", token),
    canEditAiNotes: () =>
      hasPermission(user, "AI_NOTES_EDIT", token) ||
      hasPermission(user, "ai_notes:update", token),
    canViewMedicines: () =>
      hasPermission(user, "MEDICINE_VIEW", token) ||
      hasPermission(user, "medicine:read", token),
    canCreateMedicine: () =>
      hasPermission(user, "MEDICINE_CREATE", token) ||
      hasPermission(user, "medicine:create", token),
    canEditMedicine: () =>
      hasPermission(user, "MEDICINE_EDIT", token) ||
      hasPermission(user, "medicine:update", token),
    canManageMedicineStatus: () =>
      hasPermission(user, "MEDICINE_DELETE", token) ||
      hasPermission(user, "MEDICINE_EDIT", token) ||
      hasPermission(user, "medicine:delete", token) ||
      hasPermission(user, "medicine:update", token),
  };
};
