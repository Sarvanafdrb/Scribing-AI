import { api } from "@/services/api";
import { Permission, PermissionMatrixResponse } from "@/types/permission.types";

export const permissionService = {
  getMatrix: async (): Promise<PermissionMatrixResponse> => {
    const response = await api.get("/permissions/matrix");
    return response.data.data;
  },

  getAll: async (): Promise<Permission[]> => {
    const response = await api.get("/permissions");
    return response.data.data || [];
  },
};
