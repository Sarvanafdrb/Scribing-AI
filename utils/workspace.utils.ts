import { Workspace } from "@/types/workspace.types";

export const ALL_ORGANIZATIONS_WORKSPACE_ID = "all";

export const ALL_ORGANIZATIONS_WORKSPACE: Workspace = {
  id: ALL_ORGANIZATIONS_WORKSPACE_ID,
  name: "All Organizations",
  organizationId: ALL_ORGANIZATIONS_WORKSPACE_ID,
  organizationName: "Platform-wide",
  status: "active",
};

export const isAllOrganizationsWorkspace = (
  workspace: Workspace | null | undefined,
): boolean => workspace?.id === ALL_ORGANIZATIONS_WORKSPACE_ID;

export const getActiveWorkspaces = (workspaces: Workspace[]) =>
  workspaces.filter((workspace) => workspace.status === "active");

export const getDefaultWorkspace = (
  workspaces: Workspace[],
  options?: { isSuperAdmin?: boolean },
): Workspace | null => {
  if (options?.isSuperAdmin) {
    return ALL_ORGANIZATIONS_WORKSPACE;
  }

  return getActiveWorkspaces(workspaces)[0] ?? null;
};

export const isWorkspaceAccessible = (
  workspace: Workspace | null,
  workspaces: Workspace[],
  options?: { isSuperAdmin?: boolean },
) => {
  if (!workspace) return false;

  if (isAllOrganizationsWorkspace(workspace)) {
    return Boolean(options?.isSuperAdmin);
  }

  return workspaces.some(
    (item) => item.id === workspace.id && item.status === "active",
  );
};
