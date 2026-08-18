"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { workspaceService } from "@/services/workspace.service";
import { workspaceKeys } from "@/services/workspace.queries";
import { Workspace } from "@/types/workspace.types";
import { isSuperAdminUser, getUserOrganizationId } from "@/types/auth.types";
import {
  getDefaultWorkspace,
  isWorkspaceAccessible,
} from "@/utils/workspace.utils";

export const useWorkspaceBootstrap = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const authHydrated = useAuthStore((state) => state._hasHydrated);
  const workspaceHydrated = useWorkspaceStore((state) => state._hasHydrated);
  const clearWorkspace = useWorkspaceStore((state) => state.clearWorkspace);
  const setSelectedWorkspace = useWorkspaceStore(
    (state) => state.setSelectedWorkspace,
  );
  const queryClient = useQueryClient();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasWorkspaceAccess, setHasWorkspaceAccess] = useState(true);
  const isSuperAdmin = isSuperAdminUser(user, token);

  useEffect(() => {
    if (!authHydrated || !workspaceHydrated || !token) {
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;

    const bootstrapWorkspace = async () => {
      setIsBootstrapping(true);

      try {
        const cachedWorkspaces = queryClient.getQueryData<Workspace[]>(
          workspaceKeys.list(),
        );
        const workspaces =
          cachedWorkspaces && cachedWorkspaces.length > 0
            ? cachedWorkspaces
            : await workspaceService.getAll();

        if (!cachedWorkspaces?.length) {
          queryClient.setQueryData(workspaceKeys.list(), workspaces);
        }

        if (cancelled) return;

        const organizationId = getUserOrganizationId(user);
        const defaultWorkspace = getDefaultWorkspace(workspaces, {
          isSuperAdmin,
          organizationId,
        });

        if (!defaultWorkspace) {
          clearWorkspace();
          setHasWorkspaceAccess(false);
          return;
        }

        setHasWorkspaceAccess(true);

        const currentSelected =
          useWorkspaceStore.getState().selectedWorkspace;
        const selectedIsAccessible = isWorkspaceAccessible(
          currentSelected,
          workspaces,
          { isSuperAdmin },
        );
        const shouldResetNonSuperAdminOrg =
          !isSuperAdmin &&
          currentSelected &&
          currentSelected.id !== defaultWorkspace.id;

        if (
          !currentSelected ||
          !selectedIsAccessible ||
          shouldResetNonSuperAdminOrg
        ) {
          setSelectedWorkspace(defaultWorkspace);
        }
      } catch {
        if (!useWorkspaceStore.getState().selectedWorkspace) {
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
    isSuperAdmin,
    queryClient,
    setSelectedWorkspace,
    token,
    user?.id,
    workspaceHydrated,
  ]);

  return { isBootstrapping, hasWorkspaceAccess };
};
