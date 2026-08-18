export interface UserOrganization {
  _id: string;
  id?: string;
  name: string;
  organizationCode?: string;
}

export interface UserRole {
  _id: string;
  id?: string;
  name: string;
  description?: string;
}

export interface UserDepartment {
  _id: string;
  id?: string;
  name: string;
  isActive?: boolean;
}

export interface User {
  id?: string;
  _id?: string;
  userCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationId?: UserOrganization | string;
  organizationName?: string;
  roleId?: UserRole | string;
  departmentId?: UserDepartment | string | null;
  qualifications?: string[];
  specialization?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  lastLogin?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationId: string;
  roleId?: string;
  departmentId?: string | null;
  qualifications?: string[];
  specialization?: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  roleId?: string;
  departmentId?: string | null;
  qualifications?: string[];
  specialization?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

export const getUserDepartmentId = (user?: User | null): string => {
  if (!user?.departmentId) return "";
  if (typeof user.departmentId === "object") {
    return user.departmentId.id || user.departmentId._id || "";
  }
  return user.departmentId;
};

export const getUserDepartmentName = (user?: User | null): string => {
  if (!user?.departmentId) return "";
  if (typeof user.departmentId === "object") {
    return user.departmentId.name || "";
  }
  return "";
};

export const isDoctorRoleName = (roleName?: string | null): boolean =>
  (roleName || "").trim().toLowerCase() === "doctor";

