import { api } from "@/services/api";
import { Workspace, WorkspacesResponse } from "@/types/workspace.types";

export const workspaceService = {
  getAll: async (): Promise<Workspace[]> => {
    const response = await api.get<WorkspacesResponse>("/auth/workspaces");
    return response.data.data;
  },
};
