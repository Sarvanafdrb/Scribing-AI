export interface Department {
  id?: string;
  _id?: string;
  departmentCode?: string;
  organizationId: string;
  organizationName?: string;
  name: string;
  description?: string;
  isActive?: boolean;
  userCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateDepartmentData {
  name: string;
  description?: string;
  organizationId?: string;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
}

export const NO_DEPARTMENT_VALUE = "__none__";

export const getDepartmentId = (department?: Department | null): string =>
  department?.id || department?._id || "";
