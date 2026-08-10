import { api } from "@/services/api";
import { CreateRoleData, Role, UpdateRoleData } from "@/types/role.types";
import { RolePermissionsResponse } from "@/types/permission.types";
import { matchesNormalizedSearch } from "@/utils/search.utils";

export const roleService = {
  getAll: async (organizationId: string): Promise<Role[]> => {
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
    const organizationId = params?.organizationId?.trim();
    const isAllOrganizations =
      !organizationId || organizationId.toLowerCase() === "all";

    const response = await api.get("/roles", {
      params: isAllOrganizations ? undefined : { organizationId },
    });

    const allRoles: Role[] = response.data.data || [];
    const search = params?.search || "";
    const filtered = search
      ? allRoles.filter(
          (r) =>
            matchesNormalizedSearch(r.name, search) ||
            matchesNormalizedSearch(r.description, search),
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

  activate: async (id: string): Promise<Role> => {
    const response = await api.patch(`/roles/${id}/activate`);
    return response.data.data;
  },

  getPermissions: async (id: string): Promise<RolePermissionsResponse> => {
    const response = await api.get(`/roles/${id}/permissions`);
    return response.data.data;
  },

  assignPermissions: async (
    id: string,
    permissionIds: string[],
  ): Promise<RolePermissionsResponse> => {
    const response = await api.post(`/roles/${id}/permissions`, {
      permissionIds,
    });
    return response.data.data;
  },

  getStats: async () => {
    const response = await api.get("/roles/stats");
    return response.data.data;
  },
};
