"use client";

import { useState } from "react";
import Link from "next/link";
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
import { AudioPlayback } from "@/components/recording/AudioPlayback";
import { AudioFileUpload } from "@/components/recording/AudioFileUpload";
import { SessionStatusBadge } from "@/app/(admin)/sessions/components/SessionStatusBadge";
import { useMediaRecorder } from "@/hooks/recording/useMediaRecorder";
import { useSession } from "@/hooks/sessions/useSession";
import { recordingService } from "@/services/recording.service";
import { ArrowLeft, FileAudio, Loader2 } from "lucide-react";

interface RecordingStudioProps {
  sessionId: string;
}

export function RecordingStudio({ sessionId }: RecordingStudioProps) {
  const { data: session, isLoading, refetch } = useSession(sessionId);
  const recorder = useMediaRecorder();
  const [isUploading, setIsUploading] = useState(false);

  const uploadBlob = async (
    blob: Blob,
    duration: number,
    fileName: string,
    mimeType: string,
  ) => {
    setIsUploading(true);

    try {
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

      await refetch();
      recorder.reset();
      toast.success("Recording saved successfully");
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

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);

    try {
      await recordingService.start(sessionId);
      await recordingService.uploadFile(sessionId, file, 0, file.name);
      await refetch();
      toast.success("Audio file uploaded successfully");
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/sessions/${sessionId}`}>
            <Button variant="ghost" className="pl-0 mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Session
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{session.title}</h1>
          <p className="text-muted-foreground">{session.sessionCode}</p>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5 text-blue-600" />
              Live Recording
            </CardTitle>
            <CardDescription>
              Start, pause, resume, and stop recording for this session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {recorder.error && (
              <p className="text-sm text-destructive">{recorder.error}</p>
            )}

            <RecordingControls
              state={recorder.state}
              elapsedSeconds={recorder.elapsedSeconds}
              isUploading={isUploading}
              onStart={handleStart}
              onPause={recorder.pause}
              onResume={recorder.resume}
              onStop={handleStop}
              onReset={recorder.reset}
            />

            {recorder.previewUrl && (
              <audio controls className="w-full" src={recorder.previewUrl}>
                Your browser does not support audio playback.
              </audio>
            )}

            {isUploading && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving recording...
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <SessionStatusBadge status={session.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="outline">{session.sessionType}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span>{session.duration || 0}s</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Playback</CardTitle>
              <CardDescription>
                Listen to the saved session recording
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.audioUrl ? (
                <AudioPlayback sessionId={sessionId} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recording saved yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <AudioFileUpload
                onUpload={handleFileUpload}
                isUploading={isUploading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
