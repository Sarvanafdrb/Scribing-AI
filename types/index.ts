export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  organizationId: Organization | string;
  organizationName?: string;
  roleId: Role | string;
  role?: string;
  status: "active" | "inactive";
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  _id: string;
  organizationName: string;
  organizationCode: string;
  email: string;
  phone: string;
  address: string;
  subscriptionPlan: "free" | "basic" | "premium";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  _id: string;
  name: string;
  module: string;
  description?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  user: User;
}
