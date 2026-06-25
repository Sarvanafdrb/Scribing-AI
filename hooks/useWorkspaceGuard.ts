"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useWorkspaceBootstrap } from "@/hooks/useWorkspaceBootstrap";

const WORKSPACE_EXEMPT_PATHS = ["/access-not-assigned"];

export const useWorkspaceGuard = () => {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((state) => state.token);
  const authHydrated = useAuthStore((state) => state._hasHydrated);
  const selectedWorkspace = useWorkspaceStore((state) => state.selectedWorkspace);
  const workspaceHydrated = useWorkspaceStore((state) => state._hasHydrated);
  const { isBootstrapping, hasWorkspaceAccess } = useWorkspaceBootstrap();

  const isExempt = WORKSPACE_EXEMPT_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  const isReady = authHydrated && workspaceHydrated && !!token;
  const hasWorkspace = !!selectedWorkspace;

  useEffect(() => {
    if (!isReady || isBootstrapping || isExempt) return;

    if (!hasWorkspaceAccess || !hasWorkspace) {
      router.replace("/access-not-assigned");
    }
  }, [
    hasWorkspace,
    hasWorkspaceAccess,
    isBootstrapping,
    isExempt,
    isReady,
    router,
  ]);

  return {
    isReady,
    hasWorkspace,
    hasWorkspaceAccess,
    isExempt,
    shouldShowLoading: !isReady || isBootstrapping,
    shouldBlock:
      isReady && !isBootstrapping && !isExempt && (!hasWorkspaceAccess || !hasWorkspace),
  };
};
