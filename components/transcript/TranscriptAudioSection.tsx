"use client";

import { useMemo } from "react";
import {
  Calendar,
  Clock,
  Headphones,
  Stethoscope,
  UserRound,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DoctorAudioPlayer } from "@/components/doctor/DoctorAudioPlayer";
import { Session, SessionUser } from "@/types/session.types";
import type { Patient } from "@/types/patient.types";
import { getPatientFullName } from "@/utils/patient.utils";

function formatDateTime(value?: string) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(seconds?: number) {
  if (!seconds) return "—";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function getSessionPlaybackSource(session: Session): string | undefined {
  return session.audioPlaybackUrl || session.audioUrl || undefined;
}

interface TranscriptAudioSectionProps {
  session: Session;
  sessionId: string;
}

export function TranscriptAudioSection({
  session,
  sessionId,
}: TranscriptAudioSectionProps) {
  const playbackSource = getSessionPlaybackSource(session);
  const hasRecording = Boolean(playbackSource);

  const patient = useMemo(
    () =>
      typeof session.patientId === "object"
        ? (session.patientId as Patient)
        : null,
    [session.patientId],
  );

  const doctor = useMemo(
    () =>
      typeof session.userId === "object"
        ? (session.userId as SessionUser)
        : null,
    [session.userId],
  );

  const patientName = patient ? getPatientFullName(patient) : "—";
  const doctorName = doctor
    ? `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() || "—"
    : "—";
  const recordingDateTime = formatDateTime(
    session.completedAt || session.startedAt || session.createdAt,
  );

  return (
    <Card className="border-blue-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-blue-600" />
          Session Recording
        </CardTitle>
        <CardDescription>
          Listen to the session recording before reviewing the transcript
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-1 gap-4 rounded-lg border bg-slate-50 p-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
              Patient Name
            </dt>
            <dd className="font-medium text-slate-900">{patientName}</dd>
          </div>
          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Stethoscope className="h-3.5 w-3.5" />
              Doctor Name
            </dt>
            <dd className="font-medium text-slate-900">{doctorName}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Session Code
            </dt>
            <dd className="font-mono font-medium text-slate-900">
              {session.sessionCode}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Recording Date &amp; Time
            </dt>
            <dd className="text-slate-800">{recordingDateTime}</dd>
          </div>
          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Duration
            </dt>
            <dd className="text-slate-800">
              {formatDuration(session.duration)}
            </dd>
          </div>
        </dl>

        {!hasRecording ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No recording available.
          </div>
        ) : (
          <DoctorAudioPlayer
            sessionId={sessionId}
            audioUrl={session.audioUrl}
            audioPlaybackUrl={session.audioPlaybackUrl}
            knownDuration={session.duration}
          />
        )}
      </CardContent>
    </Card>
  );
}
