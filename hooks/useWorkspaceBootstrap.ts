"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { workspaceService } from "@/services/workspace.service";
import { workspaceKeys } from "@/services/workspace.queries";
import {
  getDefaultWorkspace,
  isWorkspaceAccessible,
} from "@/utils/workspace.utils";

export const useWorkspaceBootstrap = () => {
  const token = useAuthStore((state) => state.token);
  const authHydrated = useAuthStore((state) => state._hasHydrated);
  const selectedWorkspace = useWorkspaceStore((state) => state.selectedWorkspace);
  const workspaceHydrated = useWorkspaceStore((state) => state._hasHydrated);
  const clearWorkspace = useWorkspaceStore((state) => state.clearWorkspace);
  const setSelectedWorkspace = useWorkspaceStore(
    (state) => state.setSelectedWorkspace,
  );
  const queryClient = useQueryClient();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasWorkspaceAccess, setHasWorkspaceAccess] = useState(true);

  useEffect(() => {
    if (!authHydrated || !workspaceHydrated || !token) {
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;

    const bootstrapWorkspace = async () => {
      setIsBootstrapping(true);

      try {
        const workspaces = await workspaceService.getAll();
        queryClient.setQueryData(workspaceKeys.list(), workspaces);

        if (cancelled) return;

        const defaultWorkspace = getDefaultWorkspace(workspaces);

        if (!defaultWorkspace) {
          clearWorkspace();
          setHasWorkspaceAccess(false);
          return;
        }

        setHasWorkspaceAccess(true);

        if (!isWorkspaceAccessible(selectedWorkspace, workspaces)) {
          setSelectedWorkspace(defaultWorkspace);
        }
      } catch {
        if (!selectedWorkspace) {
          setHasWorkspaceAccess(false);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapWorkspace();

    return () => {
      cancelled = true;
    };
  }, [
    authHydrated,
    clearWorkspace,
    queryClient,
    selectedWorkspace,
    setSelectedWorkspace,
    token,
    workspaceHydrated,
  ]);

  return { isBootstrapping, hasWorkspaceAccess };
};
