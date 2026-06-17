import { api } from "@/services/api";

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
};
