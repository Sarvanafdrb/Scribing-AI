"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/store/workspace.store";
import { Workspace } from "@/types/workspace.types";
import { organizationKeys } from "@/services/organization.queries";
import { userKeys } from "@/services/user.queries";
import { roleKeys } from "@/services/role.queries";
import { sessionKeys } from "@/services/session.queries";
import { patientKeys } from "@/services/patient.queries";
import { transcriptKeys } from "@/services/transcript.queries";
import { workspaceKeys } from "@/services/workspace.queries";
import { workspaceService } from "@/services/workspace.service";
import { getDefaultWorkspace } from "@/utils/workspace.utils";

export const invalidateWorkspaceData = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
  queryClient.invalidateQueries({ queryKey: organizationKeys.all });
  queryClient.invalidateQueries({ queryKey: userKeys.all });
  queryClient.invalidateQueries({ queryKey: roleKeys.all });
  queryClient.invalidateQueries({ queryKey: sessionKeys.all });
  queryClient.invalidateQueries({ queryKey: patientKeys.all });
  queryClient.invalidateQueries({ queryKey: transcriptKeys.all });
};

export const useWorkspaceSelection = () => {
  const queryClient = useQueryClient();
  const { selectedWorkspace, setSelectedWorkspace } = useWorkspaceStore();

  const selectWorkspace = useCallback(
    (workspace: Workspace) => {
      setSelectedWorkspace(workspace);
      invalidateWorkspaceData(queryClient);
    },
    [queryClient, setSelectedWorkspace],
  );

  const switchWorkspace = useCallback(
    (workspace: Workspace) => {
      if (workspace.status !== "active") {
        toast.error("Workspace unavailable", {
          description: "This workspace is inactive. Contact your administrator.",
        });
        return;
      }

      if (selectedWorkspace?.id === workspace.id) return;

      selectWorkspace(workspace);
      toast.success("Workspace switched", {
        description: `Now working in ${workspace.name}`,
      });
    },
    [selectWorkspace, selectedWorkspace?.id],
  );

  return {
    selectedWorkspace,
    selectWorkspace,
    switchWorkspace,
  };
};

export const resolvePostLoginWorkspace = async (): Promise<{
  redirectTo: string;
  workspace?: Workspace;
}> => {
  const workspaces = await workspaceService.getAll();
  const defaultWorkspace = getDefaultWorkspace(workspaces);

  if (!defaultWorkspace) {
    useWorkspaceStore.getState().clearWorkspace();
    return { redirectTo: "/access-not-assigned" };
  }

  return { redirectTo: "/dashboard", workspace: defaultWorkspace };
};
