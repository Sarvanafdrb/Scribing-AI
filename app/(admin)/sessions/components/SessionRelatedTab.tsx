"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  Mic,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkCell } from "@/components/shared/LinkCell";
import { AudioPlayback } from "@/components/recording/AudioPlayback";
import { TranscriptSegmentList } from "@/components/transcript/TranscriptSegmentList";
import type { Patient } from "@/types/patient.types";
import type {
  Session,
  SessionOrganization,
  SessionUser,
} from "@/types/session.types";
import { getPatientFullName } from "@/utils/patient.utils";

interface SessionRelatedTabProps {
  session: Session;
  sessionId: string;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
};

const formatDuration = (seconds?: number) => {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

const formatStatus = (status?: string) => {
  if (!status) return "—";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const RelatedCard = ({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="glass rounded-2xl border border-border/60 p-4 sm:p-5 shadow-sm">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
    {message}
  </div>
);

export function SessionRelatedTab({
  session,
  sessionId,
}: SessionRelatedTabProps) {
  const org =
    typeof session.organizationId === "object"
      ? (session.organizationId as SessionOrganization)
      : null;
  const orgId =
    org?.id ||
    org?._id ||
    (typeof session.organizationId === "string" ? session.organizationId : "");

  const doctor =
    typeof session.userId === "object"
      ? (session.userId as SessionUser)
      : null;
  const doctorId =
    doctor?.id ||
    doctor?._id ||
    (typeof session.userId === "string" ? session.userId : "");

  const patient =
    typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;
  const patientId =
    patient?.id ||
    patient?._id ||
    (typeof session.patientId === "string" ? session.patientId : "");

  const segments = session.recordingSegments || [];
  const hasAudio = Boolean(session.audioUrl);
  const transcriptSegments = session.transcriptData?.segments || [];
  const aiNotes = session.aiNotes;

  const activityItems = useMemo(() => {
    const items: Array<{
      id: string;
      icon: React.ReactNode;
      title: string;
      description: string;
      when: string;
      at: number;
    }> = [];

    if (session.createdAt) {
      items.push({
        id: "created",
        icon: <Calendar className="h-3.5 w-3.5" />,
        title: "Consultation created",
        description: session.sessionCode || sessionId,
        when: formatDateTime(session.createdAt),
        at: new Date(session.createdAt).getTime(),
      });
    }

    if (session.startedAt) {
      items.push({
        id: "started",
        icon: <Mic className="h-3.5 w-3.5" />,
        title: "Recording started",
        description: "Consultation recording began",
        when: formatDateTime(session.startedAt),
        at: new Date(session.startedAt).getTime(),
      });
    }

    for (const [index, segment] of segments.entries()) {
      items.push({
        id: `segment-${index}`,
        icon: <Mic className="h-3.5 w-3.5" />,
        title: `Audio segment ${index + 1}`,
        description: `${segment.fileName || "segment"} · ${formatDuration(segment.duration)}`,
        when: formatDateTime(segment.uploadedAt),
        at: segment.uploadedAt
          ? new Date(segment.uploadedAt).getTime()
          : Date.now() - (segments.length - index),
      });
    }

    if (session.transcriptData?.metadata?.processedAt || session.transcript) {
      const when =
        (session.transcriptData?.metadata as { processedAt?: string })
          ?.processedAt || session.updatedAt;
      items.push({
        id: "transcript",
        icon: <FileText className="h-3.5 w-3.5" />,
        title: "Transcript ready",
        description: `${transcriptSegments.length || 0} segment(s)`,
        when: formatDateTime(when),
        at: when ? new Date(when).getTime() : 0,
      });
    }

    if (aiNotes?.generatedAt || aiNotes?.status === "completed") {
      items.push({
        id: "ai-notes",
        icon: <Stethoscope className="h-3.5 w-3.5" />,
        title: "AI notes generated",
        description: aiNotes.summary
          ? aiNotes.summary.slice(0, 120)
          : "Clinical notes available",
        when: formatDateTime(aiNotes.generatedAt || session.updatedAt),
        at: new Date(aiNotes.generatedAt || session.updatedAt || 0).getTime(),
      });
    }

    if (session.completedAt) {
      items.push({
        id: "completed",
        icon: <Calendar className="h-3.5 w-3.5" />,
        title: "Consultation completed",
        description: formatStatus(session.status),
        when: formatDateTime(session.completedAt),
        at: new Date(session.completedAt).getTime(),
      });
    }

    return items.sort((a, b) => b.at - a.at);
  }, [
    aiNotes,
    segments,
    session,
    sessionId,
    transcriptSegments.length,
  ]);

  return (
    <div className="space-y-4">
      <RelatedCard
        title="Patient"
        description="Patient linked to this consultation"
        action={
          patientId ? (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/patients/${patientId}`}>
                Open patient
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null
        }
      >
        {!patientId ? (
          <EmptyState message="No patient linked to this consultation." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      <LinkCell href={`/patients/${patientId}`}>
                        {patient ? getPatientFullName(patient) : patientId}
                      </LinkCell>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {patient?.patientCode || "—"}
                  </TableCell>
                  <TableCell>{patient?.phoneNumber || "—"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Doctor"
        description="Assigned clinician for this consultation"
        action={
          doctorId ? (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/users/${doctorId}`}>
                Open user
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null
        }
      >
        {!doctorId ? (
          <EmptyState message="No doctor assigned." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-muted-foreground" />
                      <LinkCell href={`/users/${doctorId}`}>
                        {doctor
                          ? `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() ||
                            doctor.email ||
                            doctorId
                          : doctorId}
                      </LinkCell>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doctor?.email || "—"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Organization"
        description="Organization this consultation belongs to"
      >
        {!orgId ? (
          <EmptyState message="No organization linked." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <LinkCell href={`/organizations/${orgId}`}>
                        {org?.name || orgId}
                      </LinkCell>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {org?.organizationCode || "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                    >
                      <Link href={`/organizations/${orgId}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Recording"
        description={
          hasAudio
            ? `Audio available · ${formatDuration(session.duration || session.totalDuration)}`
            : "No recording uploaded yet"
        }
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href={`/sessions/${sessionId}/recording`}>
              Open recording
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      >
        {hasAudio ? (
          <AudioPlayback
            sessionId={sessionId}
            audioUrl={session.audioUrl}
            audioPlaybackUrl={session.audioPlaybackUrl}
            knownDuration={session.duration}
            title=""
          />
        ) : (
          <EmptyState message="No recording available for this consultation." />
        )}
      </RelatedCard>

      <RelatedCard
        title="Recording Segments"
        description={`${segments.length} uploaded segment${segments.length === 1 ? "" : "s"}`}
      >
        {segments.length === 0 ? (
          <EmptyState message="No audio segments uploaded." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((segment, index) => (
                  <TableRow key={`${segment.url}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm">
                      {segment.fileName || "segment"}
                    </TableCell>
                    <TableCell>{formatDuration(segment.duration)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(segment.uploadedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Transcript"
        description={
          transcriptSegments.length
            ? `${transcriptSegments.length} segments`
            : session.transcript
              ? "Plain transcript available"
              : "No transcript yet"
        }
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href={`/sessions/${sessionId}/transcript`}>
              Open transcript
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      >
        {transcriptSegments.length > 0 ? (
          <div className="space-y-3">
            <TranscriptSegmentList segments={transcriptSegments.slice(0, 5)} />
            {transcriptSegments.length > 5 ? (
              <p className="text-sm text-muted-foreground">
                Showing first 5 segments. Open transcript for the full view.
              </p>
            ) : null}
          </div>
        ) : session.transcript ? (
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-sm whitespace-pre-wrap">
            {session.transcript.slice(0, 600)}
            {session.transcript.length > 600 ? "…" : ""}
          </div>
        ) : (
          <EmptyState message="No transcript generated yet." />
        )}
      </RelatedCard>

      <RelatedCard
        title="AI Notes"
        description={
          aiNotes?.status
            ? `Status: ${formatStatus(aiNotes.status)}`
            : "Clinical notes for this consultation"
        }
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href={`/sessions/${sessionId}/notes`}>
              Open AI notes
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      >
        {aiNotes?.summary || aiNotes?.assessment || aiNotes?.plan ? (
          <div className="space-y-3 text-sm">
            {aiNotes.summary ? (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Summary
                </p>
                <p className="text-foreground">{aiNotes.summary}</p>
              </div>
            ) : null}
            {aiNotes.assessment ? (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Assessment
                </p>
                <p className="text-foreground">{aiNotes.assessment}</p>
              </div>
            ) : null}
            {aiNotes.plan ? (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Plan
                </p>
                <p className="text-foreground">{aiNotes.plan}</p>
              </div>
            ) : null}
            {aiNotes.status ? (
              <Badge variant="secondary">{formatStatus(aiNotes.status)}</Badge>
            ) : null}
          </div>
        ) : (
          <EmptyState message="No AI notes generated yet." />
        )}
      </RelatedCard>

      <RelatedCard
        title="Activity Timeline"
        description="Consultation lifecycle events"
      >
        {activityItems.length === 0 ? (
          <EmptyState message="No activity to show yet." />
        ) : (
          <ol className="relative space-y-4 border-l border-border/70 pl-5">
            {activityItems.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-[1.55rem] flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {item.when}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </RelatedCard>
    </div>
  );
}
