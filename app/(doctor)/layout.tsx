"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useAuthValidation } from "@/hooks/useAuthValidation";
import { useAutoLogin } from "@/hooks/useAutoLogin";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { useWorkspaceGuard } from "@/hooks/useWorkspaceGuard";
import { recordDiagEvent } from "@/hooks/recording/recordingFailureDiagnostics";
import { useActiveRecordingStore } from "@/store/active-recording.store";
import { isSuperAdminUser } from "@/types/auth.types";
import { canAccessDoctorWorkspace } from "@/constants/permissions";
import { resolveAuthenticatedHomePath } from "@/utils/authRedirect";

const FILE = "app/(doctor)/layout.tsx";
const PREFIX = "[LAYOUT-DIAG]";

function layoutDiag(
  event: string,
  details: Record<string, unknown> = {},
  options?: { trace?: boolean },
) {
  const payload = {
    t: new Date().toISOString(),
    ms: Date.now(),
    event,
    ...details,
  };
  console.log(PREFIX, event, payload);

  recordDiagEvent(event, {
    file: FILE,
    fn: "DoctorLayout",
    details,
    includeStack: Boolean(options?.trace),
  });

  if (options?.trace) {
    console.trace(`${PREFIX} TRACE → ${event}`);
  }
}

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user, _hasHydrated, isLoading } = useAuthStore();
  const router = useRouter();
  const { isValidating } = useAuthValidation();
  const { shouldShowLoading: workspaceGuardLoading, shouldBlock } =
    useWorkspaceGuard();

  useAutoLogin();
  useSessionExpiry();

  const isSuperAdmin = isSuperAdminUser(user, token);
  const hasWorkspaceAccess = canAccessDoctorWorkspace(
    user?.permissions || [],
    isSuperAdmin,
  );

  const isLocallyRecording = useActiveRecordingStore(
    (state) => state.isLocallyRecording,
  );

  // Never unmount doctor workspace (killing MediaRecorder) while a consultation
  // is actively recording — otherwise long recordings get false "Resume" popups.
  const shouldShowLoading =
    !isLocallyRecording &&
    (!_hasHydrated || isLoading || isValidating || workspaceGuardLoading);

  const prevRef = useRef<{
    _hasHydrated: boolean;
    isLoading: boolean;
    isValidating: boolean;
    workspaceGuardLoading: boolean;
    shouldShowLoading: boolean;
    token: string | null;
    shouldBlock: boolean;
    initialized: boolean;
  } | null>(null);
  const prevRenderBranchRef = useRef<string | null>(null);

  const renderBranch = shouldShowLoading
    ? "loadingSpinner"
    : !token || shouldBlock
      ? "null"
      : "children";

  if (prevRenderBranchRef.current !== renderBranch) {
    if (renderBranch === "loadingSpinner") {
      layoutDiag("layout.render.loadingSpinner", {
        _hasHydrated,
        isLoading,
        isValidating,
        workspaceGuardLoading,
        shouldShowLoading,
        previousBranch: prevRenderBranchRef.current,
      });
    } else if (renderBranch === "null") {
      layoutDiag("layout.render.null", {
        tokenPresent: Boolean(token),
        shouldBlock,
        reason: !token ? "no-token" : "shouldBlock",
        previousBranch: prevRenderBranchRef.current,
      });
    } else {
      layoutDiag("layout.render.children", {
        tokenPresent: Boolean(token),
        shouldShowLoading,
        shouldBlock,
        previousBranch: prevRenderBranchRef.current,
      });
    }
    prevRenderBranchRef.current = renderBranch;
  }

  // Diagnostics only — watch flag changes; does not alter control flow.
  useEffect(() => {
    const next = {
      _hasHydrated,
      isLoading,
      isValidating,
      workspaceGuardLoading,
      shouldShowLoading,
      token,
      shouldBlock,
      initialized: true,
    };

    const prev = prevRef.current;
    if (!prev) {
      layoutDiag("layout.flags.initial", {
        _hasHydrated,
        isLoading,
        isValidating,
        workspaceGuardLoading,
        shouldShowLoading,
        tokenPresent: Boolean(token),
        tokenLength: token?.length ?? 0,
        shouldBlock,
      });
      prevRef.current = next;
      return;
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (prev._hasHydrated !== _hasHydrated) {
      changes._hasHydrated = { from: prev._hasHydrated, to: _hasHydrated };
    }
    if (prev.isLoading !== isLoading) {
      changes.isLoading = { from: prev.isLoading, to: isLoading };
    }
    if (prev.isValidating !== isValidating) {
      changes.isValidating = { from: prev.isValidating, to: isValidating };
    }
    if (prev.workspaceGuardLoading !== workspaceGuardLoading) {
      changes.workspaceGuardLoading = {
        from: prev.workspaceGuardLoading,
        to: workspaceGuardLoading,
      };
      layoutDiag("workspaceGuardLoading.changed", {
        from: prev.workspaceGuardLoading,
        to: workspaceGuardLoading,
      });
    }
    if (prev.shouldShowLoading !== shouldShowLoading) {
      changes.shouldShowLoading = {
        from: prev.shouldShowLoading,
        to: shouldShowLoading,
      };
      layoutDiag("shouldShowLoading.changed", {
        from: prev.shouldShowLoading,
        to: shouldShowLoading,
        _hasHydrated,
        isLoading,
        isValidating,
        workspaceGuardLoading,
      });
    }
    if (prev.token !== token) {
      changes.token = {
        from: prev.token ? `present(len=${prev.token.length})` : null,
        to: token ? `present(len=${token.length})` : null,
      };
    }
    if (prev.shouldBlock !== shouldBlock) {
      changes.shouldBlock = { from: prev.shouldBlock, to: shouldBlock };
      layoutDiag("shouldBlock.changed", {
        from: prev.shouldBlock,
        to: shouldBlock,
        tokenPresent: Boolean(token),
      });
    }

    if (Object.keys(changes).length > 0) {
      const risingShowLoading =
        prev.shouldShowLoading === false && shouldShowLoading === true;
      const risingBlock = prev.shouldBlock === false && shouldBlock === true;

      layoutDiag(
        "layout.flags.changed",
        {
          changes,
          snapshot: {
            _hasHydrated,
            isLoading,
            isValidating,
            workspaceGuardLoading,
            shouldShowLoading,
            tokenPresent: Boolean(token),
            shouldBlock,
          },
        },
        { trace: risingShowLoading || risingBlock },
      );

      if (risingShowLoading) {
        layoutDiag(
          "shouldShowLoading false→true",
          {
            _hasHydrated,
            isLoading,
            isValidating,
            workspaceGuardLoading,
            shouldShowLoading,
          },
          { trace: true },
        );
      }

      if (risingBlock) {
        layoutDiag(
          "shouldBlock false→true",
          { shouldBlock, tokenPresent: Boolean(token) },
          { trace: true },
        );
      }
    }

    prevRef.current = next;
  }, [
    _hasHydrated,
    isLoading,
    isValidating,
    workspaceGuardLoading,
    shouldShowLoading,
    token,
    shouldBlock,
  ]);

  useEffect(() => {
    if (!_hasHydrated || isLoading || isValidating || workspaceGuardLoading) {
      return;
    }
    if (!token) {
      layoutDiag(
        "router.replace(/login)",
        {
          reason: "token falsy after hydrate",
          _hasHydrated,
          isLoading,
          isValidating,
          tokenPresent: false,
        },
        { trace: true },
      );
      router.replace("/login");
      return;
    }
    if (!hasWorkspaceAccess) {
      router.replace(resolveAuthenticatedHomePath(user, token));
    }
  }, [
    _hasHydrated,
    hasWorkspaceAccess,
    isLoading,
    isSuperAdmin,
    isValidating,
    router,
    token,
    user?.permissions,
    workspaceGuardLoading,
  ]);

  if (shouldShowLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token || shouldBlock || !hasWorkspaceAccess) {
    return null;
  }

  return <div className="min-h-screen bg-background">{children}</div>;
}
