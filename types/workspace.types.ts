export type WorkspaceStatus = "active" | "inactive";

export interface Workspace {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  organizationCode?: string;
  status: WorkspaceStatus;
}

export interface WorkspacesResponse {
  success: boolean;
  message: string;
  data: Workspace[];
}
