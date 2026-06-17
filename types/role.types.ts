export interface Role {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  organizationId?: string;
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  organizationId: string;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  isActive?: boolean;
}
