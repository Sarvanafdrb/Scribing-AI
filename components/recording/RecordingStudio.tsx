"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecordingControls } from "@/components/recording/RecordingControls";
import { RecordingPipelineProgress } from "@/components/recording/RecordingPipelineProgress";
import { AudioPlayback } from "@/components/recording/AudioPlayback";
import { AudioFileUpload } from "@/components/recording/AudioFileUpload";
import { TranscriptSegmentList } from "@/components/transcript/TranscriptSegmentList";
import { SessionStatusBadge } from "@/app/(admin)/sessions/components/SessionStatusBadge";
import { useMediaRecorder } from "@/hooks/recording/useMediaRecorder";
import { useSession } from "@/hooks/sessions/useSession";
import { useTranscript } from "@/hooks/transcript/useTranscript";
import { useTranscriptMutations } from "@/hooks/transcript/useTranscriptMutations";
import { recordingService } from "@/services/recording.service";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import { transcriptKeys } from "@/services/transcript.queries";
import { SessionStatus } from "@/types/session.types";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileAudio,
  FileText,
  Loader2,
} from "lucide-react";

type WorkflowPhase = "ready" | "recording" | "postStop";

interface RecordingStudioProps {
  sessionId: string;
  embedded?: boolean;
}

const resolveInitialWorkflow = (
  audioUrl?: string,
): WorkflowPhase => {
  return audioUrl ? "postStop" : "ready";
};

const resolveDisplayStatus = (
  workflow: WorkflowPhase,
  sessionStatus: SessionStatus,
  hasAudio: boolean,
): SessionStatus => {
  if (workflow === "recording") return "recording";
  if (!hasAudio) return "created";
  return sessionStatus;
};

export function RecordingStudio({ sessionId, embedded = false }: RecordingStudioProps) {
  const queryClient = useQueryClient();
  const { data: session, isLoading, refetch } = useSession(sessionId);
  const { transcript, refetch: refetchTranscript } = useTranscript(sessionId);
  const { generateTranscript } = useTranscriptMutations(sessionId);
  const recorder = useMediaRecorder();
  const [isUploading, setIsUploading] = useState(false);
  const [showExternalUpload, setShowExternalUpload] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowPhase>("ready");

  useEffect(() => {
    setWorkflow("ready");
    setIsUploading(false);
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    setWorkflow((current) => {
      if (current === "recording" || current === "postStop") {
        return current;
      }
      return resolveInitialWorkflow(session.audioUrl);
    });
  }, [session?.audioUrl, session, sessionId]);

  const hasAudio = Boolean(session?.audioUrl);
  const displayStatus = session
    ? resolveDisplayStatus(workflow, session.status, hasAudio)
    : "created";

  const inPostStopFlow = workflow === "postStop" && (hasAudio || isUploading);
  const showPipeline = inPostStopFlow;
  const showPlayback = inPostStopFlow && hasAudio;
  const showStart =
    workflow === "ready" &&
    recorder.state === "idle" &&
    !hasAudio &&
    session?.status !== "completed";
  const controlsLocked = inPostStopFlow;

  const hasTranscript =
    Boolean(transcript?.fullText) ||
    Boolean(transcript?.segments?.length) ||
    Boolean(session?.transcript);

  const invalidateSessionData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) }),
      queryClient.invalidateQueries({
        queryKey: transcriptKeys.detail(sessionId),
      }),
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: sessionKeys.stats() }),
    ]);
    await refetch();
    await refetchTranscript();
  };

  const uploadBlob = async (
    blob: Blob,
    duration: number,
    fileName: string,
    mimeType: string,
  ) => {
    setWorkflow("postStop");
    setIsUploading(true);

    try {
      await sessionService.updateStatus(sessionId, "uploading");
      await refetch();

      const uploadConfig = await recordingService.getUploadUrl(
        sessionId,
        fileName,
        mimeType,
      );

      if (uploadConfig.mode === "s3" && uploadConfig.uploadUrl) {
        const uploadResponse = await fetch(uploadConfig.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": mimeType,
          },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload recording to S3");
        }

        await recordingService.complete(sessionId, {
          key: uploadConfig.key || undefined,
          audioUrl: uploadConfig.audioUrl || undefined,
          duration,
          contentType: mimeType,
        });
      } else {
        await recordingService.uploadFile(sessionId, blob, duration, fileName);
      }

      await invalidateSessionData();
      toast.success("Recording saved. Transcript generation started.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save recording",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleStart = async () => {
    try {
      await recordingService.start(sessionId);
      await recorder.start();
      setWorkflow("recording");
      await refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to start recording");
    }
  };

  const handleStop = async () => {
    try {
      const result = await recorder.stop();
      await uploadBlob(
        result.blob,
        result.duration,
        result.fileName,
        result.mimeType,
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to stop recording");
    }
  };

  const handleRetryTranscript = async () => {
    try {
      await generateTranscript.mutateAsync();
      await invalidateSessionData();
    } catch {
      // Error toast handled by mutation
    }
  };

  const handleExternalFileUpload = async (file: File) => {
    setWorkflow("postStop");
    setIsUploading(true);

    try {
      await recordingService.start(sessionId);
      await recordingService.uploadFile(sessionId, file, 0, file.name);
      await invalidateSessionData();
      toast.success("Audio uploaded. Transcript generation started.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to upload audio file",
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">Session not found</p>
          <Link href="/sessions" className="mt-4 inline-block">
            <Button variant="outline">Back to Sessions</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", !embedded && "mx-auto max-w-3xl")}>
      {!embedded && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={`/sessions/${sessionId}`}>
              <Button variant="ghost" className="mb-2 pl-0">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Session
              </Button>
            </Link>
            <h1 className="text-2xl font-bold sm:text-3xl">{session.title}</h1>
            <p className="text-sm text-muted-foreground">{session.sessionCode}</p>
          </div>
          <SessionStatusBadge status={displayStatus} />
        </div>
      )}

      <Card className="border-blue-100 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileAudio className="h-5 w-5 text-blue-600" />
            Session Recording
          </CardTitle>
          {workflow === "ready" && (
            <CardDescription>
              Press Start Recording when you are ready to begin the consultation.
            </CardDescription>
          )}
          {workflow === "recording" && (
            <CardDescription>
              Recording in progress. Pause or stop when finished.
            </CardDescription>
          )}
          {inPostStopFlow && (
            <CardDescription>
              Your recording is being processed automatically.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-8 pb-10">
          {recorder.error && (
            <p className="text-center text-sm text-destructive">{recorder.error}</p>
          )}

          <RecordingControls
            state={recorder.state}
            elapsedSeconds={recorder.elapsedSeconds}
            isUploading={isUploading}
            controlsLocked={controlsLocked}
            showStart={showStart}
            onStart={handleStart}
            onPause={recorder.pause}
            onResume={recorder.resume}
            onStop={handleStop}
          />

          {showPipeline && (
            <RecordingPipelineProgress
              session={session}
              transcript={transcript}
              isUploading={isUploading}
              isRetrying={generateTranscript.isPending}
              onRetry={handleRetryTranscript}
            />
          )}
        </CardContent>
      </Card>

      {showPlayback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Playback</CardTitle>
            <CardDescription>Listen to the saved recording</CardDescription>
          </CardHeader>
          <CardContent>
            <AudioPlayback sessionId={sessionId} />
          </CardContent>
        </Card>
      )}

      {inPostStopFlow && hasTranscript && (
        <Card className="border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-green-600" />
              Transcript Preview
            </CardTitle>
            <CardDescription>
              Generated automatically from your recording
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {transcript?.segments && transcript.segments.length > 0 ? (
              <TranscriptSegmentList segments={transcript.segments.slice(0, 5)} />
            ) : (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {transcript?.fullText || session.transcript}
              </p>
            )}
            <Link href={`/sessions/${sessionId}/transcript`}>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                View Full Transcript
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {inPostStopFlow && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowExternalUpload((value) => !value)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">External Audio</CardTitle>
                <CardDescription>
                  Optional: upload a file recorded outside the app
                </CardDescription>
              </div>
              {showExternalUpload ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {showExternalUpload && (
            <CardContent>
              <AudioFileUpload
                onUpload={handleExternalFileUpload}
                isUploading={isUploading}
              />
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Type</span>
          <Badge variant="outline">{session.sessionType}</Badge>
        </div>
        {hasAudio && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{session.duration || 0}s</span>
          </div>
        )}
      </div>
    </div>
  );
}
