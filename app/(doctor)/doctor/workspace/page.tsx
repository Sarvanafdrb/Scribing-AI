"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DoctorEmptyConsultationsState } from "@/components/doctor/DoctorEmptyConsultationsState";
import { useDoctorQueue } from "@/hooks/doctor/useDoctorQueue";
import { encounterService } from "@/services/encounter.service";
import type { DoctorQueueItem } from "@/types/encounter.types";

async function resolveQueueSessionId(
  item: DoctorQueueItem,
): Promise<string | null> {
  if (item.sessionId) return item.sessionId;

  if (item.kind === "ip_encounter" && item.encounterId) {
    if (item.allRoundsCompletedToday) return null;
    const data = await encounterService.startRoundForEncounter(
      item.encounterId,
      { roundScheduleId: item.nextRoundScheduleId || undefined },
    );
    return String(data.session?._id || data.session?.id || "") || null;
  }

  return null;
}

export default function DoctorWorkspaceIndexPage() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const openedKeyRef = useRef<string | null>(null);
  const {
    items,
    isLoading,
    isScopeReady,
    isError,
    error,
    refetch,
  } = useDoctorQueue();

  useEffect(() => {
    if (!isScopeReady || isLoading) return;
    if (items.length === 0) {
      setOpenFailed(false);
      setIsOpening(false);
      return;
    }

    const first = items[0];
    const key =
      first.sessionId ||
      first.encounterId ||
      `${first.encounterType}-${first.patient?._id || ""}`;

    if (openedKeyRef.current === key) return;
    openedKeyRef.current = key;

    let cancelled = false;

    const openFirst = async () => {
      setIsOpening(true);
      setOpenFailed(false);
      try {
        const sessionId = await resolveQueueSessionId(first);
        if (cancelled) return;
        if (sessionId) {
          router.replace(`/doctor/workspace/${sessionId}`);
          // Clear opening state so a stalled soft-nav cannot leave this page
          // spinning forever (hard reload was previously required after discharge).
          if (!cancelled) setIsOpening(false);
          return;
        }
        setOpenFailed(true);
        setIsOpening(false);
      } catch {
        openedKeyRef.current = null;
        if (!cancelled) {
          setOpenFailed(true);
          setIsOpening(false);
        }
      }
    };

    void openFirst();

    return () => {
      cancelled = true;
    };
  }, [isScopeReady, isLoading, items, router]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    openedKeyRef.current = null;
    setOpenFailed(false);
    try {
      const result = await refetch();
      const nextItems = result.data?.items || [];

      if (nextItems.length > 0) {
        const sessionId = await resolveQueueSessionId(nextItems[0]);
        if (sessionId) {
          router.replace(`/doctor/workspace/${sessionId}`);
          return true;
        }
      }

      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  // Only spin while auth/queue is loading or while we are actively opening a session.
  // Do NOT keep spinning whenever items exist — that trapped the page after discharge
  // when soft-navigation to the next consultation was delayed.
  if (!isScopeReady || isLoading || isOpening) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (isError) {
    const message =
      (error as { response?: { data?: { message?: string } } })?.response
        ?.data?.message ||
      "Unable to load your consultations. Please try again.";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Could not load consultations
        </h1>
        <p className="max-w-md text-sm text-red-600">{message}</p>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
        >
          Try again
        </button>
      </div>
    );
  }

  if (openFailed && items.length > 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold text-gray-800">
          Today&apos;s queue is ready
        </h1>
        <p className="max-w-md text-sm text-gray-500">
          Admitted patients will appear when you open the workspace from a
          consultation. Refresh to retry opening the next pending round.
        </p>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
        >
          Refresh queue
        </button>
      </div>
    );
  }

  return (
    <DoctorEmptyConsultationsState
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    />
  );
}
