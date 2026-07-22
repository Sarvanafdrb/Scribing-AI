"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  FileText,
  Mic,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/sessions/useSession";
import { AudioPlayback } from "@/components/recording/AudioPlayback";
import { TranscriptSegmentList } from "@/components/transcript/TranscriptSegmentList";
import { TranscriptMetadataPanel } from "@/components/transcript/TranscriptMetadataPanel";
import {
  SessionOrganization,
  SessionUser,
} from "@/types/session.types";
import type { Patient } from "@/types/patient.types";
import {
  getPatientAge,
  getPatientFullName,
} from "@/utils/patient.utils";
import { healthcareGlass, healthcareSolid } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

const formatSessionType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatDuration = (seconds?: number) => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const formatGender = (gender?: string) => {
  if (!gender) return "—";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

const recordingStatusLabel = (status: string, hasAudio: boolean) => {
  if (status === "recording") return "Recording in progress";
  if (status === "uploading") return "Uploading audio";
  if (status === "processing") return "Generating transcript";
  if (status === "transcript_ready") return "Transcript ready";
  if (status === "ai_notes_generated") return "AI notes generated";
  if (status === "ready_for_review") return "Ready for review";
  if (status === "completed" && hasAudio) return "Consultation completed";
  if (hasAudio) return "Recording available";
  if (status === "completed") return "Completed without audio";
  if (status === "failed") return "Transcription failed";
  return "Not started";
};

export default function SessionDetailsPage() {
  const { id } = useParams();
  const sessionId = id as string;
  const { data: session } = useSession(sessionId);

  if (!session) {
    return null;
  }

  const org =
    typeof session.organizationId === "object"
      ? (session.organizationId as SessionOrganization)
      : null;
  const doctor =
    typeof session.userId === "object"
      ? (session.userId as SessionUser)
      : null;
  const patient =
    typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;
  const patientAge = getPatientAge(patient);
  const hasAudio = Boolean(session.audioUrl);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className={healthcareSolid.section}>
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Patient Information</h2>
        </div>
        {patient ? (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{getPatientFullName(patient)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Patient Code</dt>
              <dd className="font-mono">{patient.patientCode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Age</dt>
              <dd>{patientAge !== null ? `${patientAge} years` : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Gender</dt>
              <dd>{formatGender(patient.gender)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{patient.phoneNumber}</dd>
            </div>
            <div className="pt-2">
              <Link
                href={`/patients/${patient.id || patient._id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                View patient record →
              </Link>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No patient linked</p>
        )}
      </section>

      <section className={healthcareSolid.section}>
        <div className="mb-4 flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Doctor Information</h2>
        </div>
        {doctor ? (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">
                {doctor.firstName} {doctor.lastName}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-right">{doctor.email || "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No doctor assigned</p>
        )}
      </section>

      <section className={cn(healthcareSolid.section, "lg:col-span-2")}>
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Session Information</h2>
        </div>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
            <dt className="text-muted-foreground">Organization</dt>
            <dd>{org?.name || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
            <dt className="text-muted-foreground">Session Type</dt>
            <dd>
              <Badge variant="outline" className="rounded-lg">
                {formatSessionType(session.sessionType)}
              </Badge>
            </dd>
          </div>
          <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
            <dt className="text-muted-foreground">Started</dt>
            <dd>{formatDateTime(session.startedAt)}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
            <dt className="text-muted-foreground">Completed</dt>
            <dd>{formatDateTime(session.completedAt)}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {formatDuration(session.duration)}
            </dd>
          </div>
          {session.description && (
            <div className="sm:col-span-2">
              <dt className="mb-1 text-muted-foreground">Notes</dt>
              <dd className="rounded-lg border bg-slate-50 p-3 text-sm">
                {session.description}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className={cn(healthcareSolid.section, "lg:col-span-2")}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Recording Status</h2>
          </div>
          <Link href={`/sessions/${sessionId}/recording`}>
            <Button
              variant="outline"
              size="sm"
              className={cn("rounded-xl", healthcareGlass.button)}
            >
              Open Recording
            </Button>
          </Link>
        </div>
        <p className="mb-3 text-sm font-medium text-slate-800">
          {recordingStatusLabel(session.status, hasAudio)}
        </p>
        {hasAudio ? (
          <AudioPlayback sessionId={sessionId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {session.status === "created"
              ? "No recording has been started for this session."
              : "Recording is not yet available for playback."}
          </p>
        )}
      </section>

      <section className={cn(healthcareSolid.section, "lg:col-span-2")}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Transcript</h2>
          </div>
          <Link href={`/sessions/${sessionId}/transcript`}>
            <Button
              variant="outline"
              size="sm"
              className={cn("rounded-xl", healthcareGlass.button)}
            >
              Open Transcript
            </Button>
          </Link>
        </div>

        {session.transcriptData || session.transcript ? (
          session.transcriptData ? (
            <div className="space-y-4">
              <TranscriptMetadataPanel transcript={session.transcriptData} />
              <TranscriptSegmentList
                segments={session.transcriptData.segments.slice(0, 5)}
              />
              {session.transcriptData.segments.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  Showing first 5 segments. Open the Transcript tab for the
                  full view.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border bg-slate-50 p-4 text-sm whitespace-pre-wrap">
              {session.transcript}
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            No transcript available yet. Start a recording to generate one.
          </p>
        )}
      </section>
    </div>
  );
}
