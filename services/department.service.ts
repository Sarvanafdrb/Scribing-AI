import { api } from "@/services/api";
import {
  CreateDepartmentData,
  Department,
  UpdateDepartmentData,
} from "@/types/department.types";

export const departmentService = {
  getAll: async (params?: {
    search?: string;
    isActive?: string;
    organizationId?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/departments", { params });
    const { data, pagination, activeCount, inactiveCount } = response.data;

    return {
      departments: (data || []) as Department[],
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      limit: pagination?.limit || 10,
      totalPages: pagination?.totalPages || 1,
      activeCount: activeCount || 0,
      inactiveCount: inactiveCount || 0,
    };
  },

  getById: async (id: string): Promise<Department> => {
    const response = await api.get(`/departments/${id}`);
    return response.data.data;
  },

  create: async (data: CreateDepartmentData): Promise<Department> => {
    const response = await api.post("/departments", data);
    return response.data.data;
  },

  update: async (
    id: string,
    data: UpdateDepartmentData,
  ): Promise<Department> => {
    const response = await api.patch(`/departments/${id}`, data);
    return response.data.data;
  },

  deactivate: async (id: string): Promise<Department> => {
    const response = await api.patch(`/departments/${id}/deactivate`);
    return response.data.data;
  },

  activate: async (id: string): Promise<Department> => {
    const response = await api.patch(`/departments/${id}/activate`);
    return response.data.data;
  },
};
