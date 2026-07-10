"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mic, Pause, Play, Square } from "lucide-react";
import { useMediaRecorder } from "@/hooks/recording/useMediaRecorder";
import { useSession } from "@/hooks/sessions/useSession";
import { useTranscript } from "@/hooks/transcript/useTranscript";
import { useTranscriptMutations } from "@/hooks/transcript/useTranscriptMutations";
import { RecordingPipelineProgress } from "@/components/recording/RecordingPipelineProgress";
import { recordingService } from "@/services/recording.service";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import { transcriptKeys } from "@/services/transcript.queries";
import { SessionStatus } from "@/types/session.types";
import { cn } from "@/lib/utils";

type WorkflowPhase = "ready" | "recording" | "postStop";

interface DoctorRecordingPanelProps {
  sessionId: string;
  onRecordingStateChange?: (state: {
    isRecording: boolean;
    elapsedSeconds: number;
  }) => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export function DoctorRecordingPanel({
  sessionId,
  onRecordingStateChange,
}: DoctorRecordingPanelProps) {
  const queryClient = useQueryClient();
  const { data: session, isLoading, refetch } = useSession(sessionId);
  const { transcript, refetch: refetchTranscript } = useTranscript(sessionId);
  const { generateTranscript } = useTranscriptMutations(sessionId);
  const recorder = useMediaRecorder();
  const [isUploading, setIsUploading] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowPhase>("ready");

  useEffect(() => {
    setWorkflow("ready");
    setIsUploading(false);
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    if (workflow === "recording" || workflow === "postStop") return;
    setWorkflow(session.audioUrl ? "postStop" : "ready");
  }, [session?.audioUrl, session, sessionId, workflow]);

  const hasAudio = Boolean(session?.audioUrl);
  const inPostStopFlow = workflow === "postStop" && (hasAudio || isUploading);
  const showStart =
    workflow === "ready" &&
    recorder.state === "idle" &&
    !hasAudio &&
    session?.status !== "completed";
  const controlsLocked = inPostStopFlow;

  const isRecording = recorder.state === "recording";

  useEffect(() => {
    onRecordingStateChange?.({
      isRecording,
      elapsedSeconds: recorder.elapsedSeconds,
    });
  }, [
    isRecording,
    recorder.elapsedSeconds,
    onRecordingStateChange,
  ]);

  const invalidateSessionData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) }),
      queryClient.invalidateQueries({
        queryKey: transcriptKeys.detail(sessionId),
      }),
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() }),
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
          headers: { "Content-Type": mimeType },
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Failed to start recording");
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
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to stop recording");
    }
  };

  const handleRetryTranscript = async () => {
    try {
      await generateTranscript.mutateAsync();
      await invalidateSessionData();
    } catch {
      // handled by mutation
    }
  };

  const statusLabel = (): string => {
    if (isRecording) return "RECORDING";
    if (isUploading) return "UPLOADING";
    if (session?.status === "processing") return "PROCESSING";
    if (hasAudio && session?.status === "completed") return "DONE";
    return "READY";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          Recording
        </h3>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide",
            isRecording
              ? "bg-red-50 text-red-600"
              : "bg-gray-100 text-gray-500",
          )}
        >
          {statusLabel()}
        </span>
      </div>

      <div className="flex flex-col items-center py-4">
        {showStart && !controlsLocked && (
          <button
            type="button"
            onClick={handleStart}
            disabled={isUploading}
            className="group flex flex-col items-center gap-3"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-600 shadow-lg shadow-teal-200 transition-transform group-hover:scale-105 group-active:scale-95">
              <Mic className="h-8 w-8 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              Start Recording
            </span>
          </button>
        )}

        {(isRecording || recorder.state === "paused") && !controlsLocked && (
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full",
                isRecording ? "bg-red-600 shadow-lg shadow-red-200" : "bg-amber-500",
              )}
            >
              <Mic className="h-8 w-8 text-white" />
            </div>
            <span className="font-mono text-2xl font-bold text-gray-800">
              {formatTime(recorder.elapsedSeconds)}
            </span>
            <div className="flex gap-2">
              {recorder.state === "recording" ? (
                <button
                  type="button"
                  onClick={recorder.pause}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={recorder.resume}
                  className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </button>
              )}
              <button
                type="button"
                onClick={handleStop}
                disabled={isUploading}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            </div>
          </div>
        )}

        {!showStart && !isRecording && recorder.state === "idle" && (
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-xl text-gray-600">
              {formatTime(recorder.elapsedSeconds)}
            </span>
            <WaveformPlaceholder active={isUploading || session.status === "processing"} />
          </div>
        )}

        {recorder.error && (
          <p className="mt-2 text-center text-sm text-red-600">{recorder.error}</p>
        )}
      </div>

      {!showStart && !isRecording && recorder.state === "idle" && (
        <WaveformPlaceholder
          active={isUploading || session.status === ("processing" as SessionStatus)}
          className="mt-2"
        />
      )}

      {inPostStopFlow && session && (
        <div className="mt-4">
          <RecordingPipelineProgress
            session={session}
            transcript={transcript}
            isUploading={isUploading}
            isRetrying={generateTranscript.isPending}
            onRetry={handleRetryTranscript}
          />
        </div>
      )}
    </section>
  );
}

function WaveformPlaceholder({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  const bars = [3, 5, 8, 12, 6, 10, 4, 7, 9, 5, 11, 6, 8, 4, 7];

  return (
    <div className={cn("flex h-8 items-end justify-center gap-0.5", className)}>
      {bars.map((height, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full bg-gray-200",
            active && "animate-pulse bg-teal-300",
          )}
          style={{ height: `${height * 2}px` }}
        />
      ))}
    </div>
  );
}
