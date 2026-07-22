"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Wifi } from "lucide-react";
import { useSession } from "@/hooks/sessions/useSession";
import { UserProfileDropdown } from "@/components/shared/UserProfileDropdown";
import { getPatientAge, getPatientFullName } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import { cn } from "@/lib/utils";

const formatGender = (gender?: string) => {
  if (!gender) return "—";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

interface DoctorHeaderProps {
  sessionId: string;
  elapsedSeconds?: number;
  isRecording?: boolean;
}

export function DoctorHeader({
  sessionId,
  elapsedSeconds = 0,
  isRecording = false,
}: DoctorHeaderProps) {
  const { data: session } = useSession(sessionId);
  const [saved, setSaved] = useState(true);

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const patientAge = getPatientAge(patient);

  useEffect(() => {
    if (isRecording) {
      setSaved(false);
      return;
    }
    if (session?.status === "completed") {
      setSaved(true);
    }
  }, [isRecording, session?.status]);

  // Reflect unsaved consultation state for review-ready sessions.
  useEffect(() => {
    if (
      session?.status === "ready_for_review" ||
      session?.status === "ai_notes_generated" ||
      session?.status === "transcript_ready"
    ) {
      setSaved(false);
    }
  }, [session?.status]);

  const conditionTag =
    session?.sessionType === "consultation"
      ? "Consultation"
      : session?.sessionType?.replace(/_/g, " ") || "Session";

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {getPatientFullName(patient)}
          </h2>
          <p className="text-sm text-gray-500">
            {patientAge !== null ? `${patientAge} yrs` : "—"}
            {patient?.gender ? ` · ${formatGender(patient.gender)}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 capitalize">
          {conditionTag}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span
          className={cn(
            "font-mono text-sm font-medium",
            isRecording ? "text-red-600" : "text-gray-700",
          )}
        >
          {formatTimer(elapsedSeconds)}
        </span>

        <div
          className={cn(
            "flex items-center gap-1.5 text-sm",
            saved ? "text-green-600" : "text-amber-600",
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span className="hidden sm:inline">{saved ? "Saved" : "Unsaved"}</span>
        </div>

        <Wifi className="h-4 w-4 text-gray-400" />

        <UserProfileDropdown />
      </div>
    </header>
  );
}
