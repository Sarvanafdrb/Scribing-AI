import { api } from "@/services/api";
import { CreateRoleData, Role, UpdateRoleData } from "@/types/role.types";

export interface RoleOption {
  _id: string;
  id?: string;
  name: string;
  description?: string;
}

export const roleService = {
  getAll: async (organizationId: string): Promise<RoleOption[]> => {
    const response = await api.get("/roles", {
      params: { organizationId },
    });
    return response.data.data || [];
  },

  getList: async (params?: {
    organizationId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/roles", {
      params: params?.organizationId ? { organizationId: params.organizationId } : undefined,
    });

    const allRoles: Role[] = response.data.data || [];
    const search = params?.search?.trim().toLowerCase();
    const filtered = search
      ? allRoles.filter(
          (r) =>
            r.name?.toLowerCase().includes(search) ||
            r.description?.toLowerCase().includes(search),
        )
      : allRoles;

    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, params?.limit || 10);
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      roles: filtered.slice(start, end),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit) || 1,
      activeCount: filtered.filter((r) => r.isActive !== false).length,
      inactiveCount: filtered.filter((r) => r.isActive === false).length,
    };
  },

  getById: async (id: string): Promise<Role> => {
    const response = await api.get(`/roles/${id}`);
    return response.data.data;
  },

  create: async (data: CreateRoleData): Promise<Role> => {
    const response = await api.post("/roles", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateRoleData): Promise<Role> => {
    const response = await api.put(`/roles/${id}`, data);
    return response.data.data;
  },

  deactivate: async (id: string): Promise<Role> => {
    const response = await api.delete(`/roles/${id}`);
    return response.data.data;
  },
};
