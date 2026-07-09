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

export interface User {
  id?: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationId?: UserOrganization | string;
  organizationName?: string;
  roleId?: UserRole | string;
  qualifications?: string[];
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
  qualifications?: string[];
  isActive?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  roleId?: string;
  qualifications?: string[];
  isActive?: boolean;
}
