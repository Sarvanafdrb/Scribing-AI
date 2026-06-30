export interface Permission {
  _id: string;
  id?: string;
  module: string;
  action: string;
  code: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionMatrixResponse {
  permissions: Permission[];
  grouped: Record<string, Permission[]>;
  total: number;
}

export interface RolePermissionsResponse {
  permissions: Permission[];
  roleName: string;
  updatedBy: string | null;
  updatedAt: string | null;
}
