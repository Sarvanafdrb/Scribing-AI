"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useDoctorQueue } from "@/hooks/doctor/useDoctorQueue";

export default function DoctorWorkspaceIndexPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const {
    sessions,
    isLoading,
    isScopeReady,
    isError,
    error,
    getSessionId,
  } = useDoctorQueue();

  useEffect(() => {
    if (!isScopeReady || isLoading) return;

    if (sessions.length > 0) {
      router.replace(`/doctor/workspace/${getSessionId(sessions[0])}`);
    }
  }, [isScopeReady, isLoading, sessions, router, getSessionId]);

  if (!isScopeReady || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (isError) {
    const message =
      (error as { response?: { data?: { message?: string } } })?.response
        ?.data?.message ||
      "Unable to load your consultations. Check that your role has Session View permission.";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Could not load consultations
        </h1>
        <p className="max-w-md text-sm text-red-600">{message}</p>
        <p className="max-w-md text-sm text-gray-500">
          Ask your admin to assign the <strong>Doctor</strong> role to your
          account (Admin → Users → Edit). That role now includes Session View,
          Recording, Transcript, and AI Notes permissions.
        </p>
      </div>
    );
  }

  const doctorName = user
    ? `Dr. ${user.firstName} ${user.lastName}`
    : "your doctor account";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-800">
        No consultations scheduled
      </h1>
      <p className="max-w-lg text-sm text-gray-500">
        Sessions assigned to <strong>{doctorName}</strong> will appear here.
        When creating a session in admin, select this same doctor in the
        &quot;Doctor&quot; field.
      </p>
      <ul className="max-w-lg space-y-2 text-left text-sm text-gray-500">
        <li>1. Admin → Sessions → Create session</li>
        <li>2. Pick the patient</li>
        <li>
          3. Pick <strong>{doctorName}</strong> as the assigned doctor
        </li>
        <li>4. Log in with that doctor account and open /doctor/workspace</li>
      </ul>
    </div>
  );
}
