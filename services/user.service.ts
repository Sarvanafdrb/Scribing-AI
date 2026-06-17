import { api } from "@/services/api";
import { CreateUserData, UpdateUserData, User } from "@/types/user.types";

export const userService = {
  getAll: async (params?: {
    search?: string;
    isActive?: string;
    organizationId?: string;
    roleId?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/users", { params });
    const { data, pagination, activeCount, inactiveCount } = response.data;

    return {
      users: (data || []) as User[],
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      limit: pagination?.limit || 10,
      totalPages: pagination?.totalPages || 1,
      activeCount: activeCount || 0,
      inactiveCount: inactiveCount || 0,
    };
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data.data;
  },

  create: async (data: CreateUserData): Promise<User> => {
    const response = await api.post("/users", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateUserData): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data.data;
  },

  deactivate: async (id: string): Promise<User> => {
    const response = await api.delete(`/users/${id}`);
    return response.data.data;
  },

  setActive: async (id: string, isActive: boolean): Promise<User> => {
    const response = await api.patch(`/users/${id}/activate`, { isActive });
    return response.data.data;
  },
};
