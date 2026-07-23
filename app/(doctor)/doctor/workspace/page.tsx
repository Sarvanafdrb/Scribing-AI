"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DoctorEmptyConsultationsState } from "@/components/doctor/DoctorEmptyConsultationsState";
import { useDoctorQueue } from "@/hooks/doctor/useDoctorQueue";

export default function DoctorWorkspaceIndexPage() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    sessions,
    isLoading,
    isScopeReady,
    isError,
    error,
    refetch,
    getSessionId,
  } = useDoctorQueue();

  useEffect(() => {
    if (!isScopeReady || isLoading) return;

    if (sessions.length > 0) {
      router.replace(`/doctor/workspace/${getSessionId(sessions[0])}`);
    }
  }, [isScopeReady, isLoading, sessions, router, getSessionId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await refetch();
      const nextSessions = result.data?.sessions || [];

      if (nextSessions.length > 0) {
        router.replace(`/doctor/workspace/${getSessionId(nextSessions[0])}`);
        return true;
      }

      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isScopeReady || isLoading) {
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

  if (sessions.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
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
