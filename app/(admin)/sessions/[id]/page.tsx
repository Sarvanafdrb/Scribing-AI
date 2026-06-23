"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Edit,
  FileText,
  Mic,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/sessions/useSession";
import { SessionStatusBadge } from "../components/SessionStatusBadge";
import { AudioPlayback } from "@/components/recording/AudioPlayback";
import { TranscriptSegmentList } from "@/components/transcript/TranscriptSegmentList";
import { TranscriptMetadataPanel } from "@/components/transcript/TranscriptMetadataPanel";
import {
  SessionOrganization,
  SessionUser,
} from "@/types/session.types";

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

export default function SessionDetailsPage() {
  const { id } = useParams();
  const sessionId = id as string;
  const { data: session, isLoading } = useSession(sessionId);

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading session...</div>;
  }

  if (!session) {
    return <div className="p-6">Session not found</div>;
  }

  const org =
    typeof session.organizationId === "object"
      ? (session.organizationId as SessionOrganization)
      : null;
  const user =
    typeof session.userId === "object"
      ? (session.userId as SessionUser)
      : null;

  const statusSteps = [
    "created",
    "recording",
    "processing",
    "completed",
  ] as const;
  const currentIndex = statusSteps.indexOf(
    session.status as (typeof statusSteps)[number],
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link href="/sessions">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/recording?sessionId=${sessionId}`}>
            <Button className="bg-red-600 hover:bg-red-700">
              <Mic className="mr-2 h-4 w-4" />
              Start Recording
            </Button>
          </Link>
          <Link href={`/transcript?sessionId=${sessionId}`}>
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              View Transcript
            </Button>
          </Link>
          <Link href={`/sessions/${sessionId}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Session
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-blue-100">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{session.title}</CardTitle>
                <CardDescription>{session.sessionCode}</CardDescription>
              </div>
            </div>
            <SessionStatusBadge status={session.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {session.description && (
            <p className="text-muted-foreground">{session.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{org?.name || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {user
                  ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                  : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">
                {formatSessionType(session.sessionType)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatDuration(session.duration)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Created: {formatDateTime(session.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Started: {formatDateTime(session.startedAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Completed: {formatDateTime(session.completedAt)}</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Status Tracking</h3>
            <div className="flex flex-wrap gap-2">
              {statusSteps.map((step, index) => {
                const isComplete =
                  session.status === "failed"
                    ? step === "created"
                    : currentIndex >= index;
                const isCurrent = session.status === step;

                return (
                  <Badge
                    key={step}
                    className={
                      session.status === "failed" && step !== "created"
                        ? "bg-gray-100 text-gray-400"
                        : isCurrent
                          ? "bg-blue-600 text-white"
                          : isComplete
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                    }
                  >
                    {formatSessionType(step)}
                  </Badge>
                );
              })}
              {session.status === "failed" && (
                <Badge className="bg-red-600 text-white">Failed</Badge>
              )}
            </div>
          </div>

          {(session.audioUrl || session.status !== "created") && (
            <div>
              <h3 className="font-semibold mb-2">Recording Playback</h3>
              {session.audioUrl ? (
                <AudioPlayback sessionId={sessionId} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Recording in progress or not uploaded yet.
                </p>
              )}
            </div>
          )}

          {(session.transcriptData || session.transcript) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Transcript</h3>
                <Link href={`/transcript?sessionId=${sessionId}`}>
                  <Button variant="outline" size="sm">
                    Open Transcript Studio
                  </Button>
                </Link>
              </div>

              {session.transcriptData ? (
                <>
                  <TranscriptMetadataPanel transcript={session.transcriptData} />
                  <TranscriptSegmentList
                    segments={session.transcriptData.segments.slice(0, 5)}
                  />
                  {session.transcriptData.segments.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      Showing first 5 segments. Open Transcript Studio for the
                      full view.
                    </p>
                  )}
                </>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {session.transcript}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
