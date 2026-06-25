import { Workspace } from "@/types/workspace.types";

export const getActiveWorkspaces = (workspaces: Workspace[]) =>
  workspaces.filter((workspace) => workspace.status === "active");

export const getDefaultWorkspace = (
  workspaces: Workspace[],
): Workspace | null => getActiveWorkspaces(workspaces)[0] ?? null;

export const isWorkspaceAccessible = (
  workspace: Workspace | null,
  workspaces: Workspace[],
) =>
  Boolean(
    workspace &&
      workspaces.some(
        (item) => item.id === workspace.id && item.status === "active",
      ),
  );
