"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  isRecordingNavigationBlocked,
  useActiveRecordingStore,
} from "@/store/active-recording.store";
import type { SessionStatus } from "@/types/session.types";

type NavigationTarget =
  | { type: "session"; sessionId: string }
  | { type: "href"; href: string };

interface UseConsultationNavigationGuardOptions {
  currentSessionId: string;
  currentSessionStatus?: SessionStatus | string | null;
}

export function useConsultationNavigationGuard({
  currentSessionId,
  currentSessionStatus,
}: UseConsultationNavigationGuardOptions) {
  const router = useRouter();
  const [pendingTarget, setPendingTarget] = useState<NavigationTarget | null>(
    null,
  );
  const [isSwitching, setIsSwitching] = useState(false);

  const isLocallyRecording = useActiveRecordingStore((state) =>
    state.isSessionLocallyRecording(currentSessionId),
  );
  const stopAndComplete = useActiveRecordingStore(
    (state) => state.stopAndComplete,
  );

  const isBlocked = isRecordingNavigationBlocked(
    currentSessionStatus,
    isLocallyRecording,
  );

  const performNavigate = useCallback(
    (target: NavigationTarget) => {
      if (target.type === "session") {
        router.push(`/doctor/workspace/${target.sessionId}`);
        return;
      }
      router.push(target.href);
    },
    [router],
  );

  const requestNavigateToSession = useCallback(
    (targetSessionId: string) => {
      if (!targetSessionId || targetSessionId === currentSessionId) {
        return;
      }

      const target: NavigationTarget = {
        type: "session",
        sessionId: targetSessionId,
      };

      if (!isBlocked) {
        performNavigate(target);
        return;
      }

      setPendingTarget(target);
    },
    [currentSessionId, isBlocked, performNavigate],
  );

  const requestNavigateToHref = useCallback(
    (href: string) => {
      if (!href) return;

      const target: NavigationTarget = { type: "href", href };

      if (!isBlocked) {
        performNavigate(target);
        return;
      }

      setPendingTarget(target);
    },
    [isBlocked, performNavigate],
  );

  const continueCurrentConsultation = useCallback(() => {
    if (isSwitching) return;
    setPendingTarget(null);
  }, [isSwitching]);

  const stopRecordingAndSwitch = useCallback(async () => {
    if (!pendingTarget || isSwitching) return;

    setIsSwitching(true);
    try {
      await stopAndComplete();
      const target = pendingTarget;
      setPendingTarget(null);
      performNavigate(target);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(
        err?.message ||
          "Could not stop and save the recording. Stay on this consultation and try again.",
      );
    } finally {
      setIsSwitching(false);
    }
  }, [isSwitching, pendingTarget, performNavigate, stopAndComplete]);

  return {
    isBlocked,
    isDialogOpen: Boolean(pendingTarget),
    isSwitching,
    requestNavigateToSession,
    requestNavigateToHref,
    continueCurrentConsultation,
    stopRecordingAndSwitch,
  };
}
