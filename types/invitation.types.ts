export type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED";

export interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  roleId: string;
  departmentId: string | null;
  userId: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  roleName: string | null;
  departmentName: string | null;
}

export interface InvitationPreview {
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  roleName: string;
  departmentName?: string | null;
  expiresAt: string;
  status: InvitationStatus;
}

export interface AcceptInvitationPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface CreateInvitationData {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  departmentId?: string | null;
}
