"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Wifi } from "lucide-react";
import { useSession } from "@/hooks/sessions/useSession";
import { UserProfileDropdown } from "@/components/shared/UserProfileDropdown";
import { getPatientAge, getPatientFullName } from "@/utils/patient.utils";
import { EncounterStatusBadge } from "@/components/doctor/EncounterStatusBadge";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
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

  return (
    <header className="glass flex items-center justify-between border-b border-border/50 px-6 py-3">
      <div className="flex min-w-0 items-start gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {getPatientFullName(patient)}
            </h2>
            <EncounterStatusBadge session={session} />
          </div>
          <p className="text-sm text-muted-foreground">
            {patientAge !== null ? `${patientAge} yrs` : "—"}
            {patient?.gender ? ` · ${formatGender(patient.gender)}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "font-mono text-sm font-medium",
            isRecording ? "text-destructive" : "text-foreground",
          )}
        >
          {formatTimer(elapsedSeconds)}
        </span>

        <div
          className={cn(
            "flex items-center gap-1.5 text-sm",
            saved ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span className="hidden sm:inline">{saved ? "Saved" : "Unsaved"}</span>
        </div>

        <Wifi className="h-4 w-4 text-muted-foreground" />
        <ThemeToggle />
        <UserProfileDropdown />
      </div>
    </header>
  );
}
