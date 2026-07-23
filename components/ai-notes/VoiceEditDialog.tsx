"use client";

import { useEffect, useState } from "react";
import { Loader2, Mic, Square, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMediaRecorder } from "@/hooks/recording/useMediaRecorder";
import { aiNotesService } from "@/services/ai-notes.service";
import type { VoiceEditPreviewResult } from "@/types/ai-notes.types";
import { cn } from "@/lib/utils";

interface VoiceEditDialogProps {
  open: boolean;
  sessionId: string;
  onOpenChange: (open: boolean) => void;
  onPreviewReady: (preview: VoiceEditPreviewResult) => void;
}

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export function VoiceEditDialog({
  open,
  sessionId,
  onOpenChange,
  onPreviewReady,
}: VoiceEditDialogProps) {
  const {
    state,
    elapsedSeconds,
    error,
    start,
    stop,
    reset,
  } = useMediaRecorder();
  const [isProcessing, setIsProcessing] = useState(false);

  const isRecording = state === "recording" || state === "paused";

  useEffect(() => {
    if (!open) {
      reset();
      setIsProcessing(false);
    }
  }, [open, reset]);

  const handleClose = () => {
    if (isProcessing) return;
    reset();
    onOpenChange(false);
  };

  const handleStart = async () => {
    try {
      await start();
    } catch {
      toast.error(
        error ||
          "Microphone permission denied. Allow microphone access and try again.",
      );
    }
  };

  const handleStopAndProcess = async () => {
    try {
      setIsProcessing(true);
      const result = await stop();

      if (!result.blob || result.blob.size === 0) {
        toast.error("No speech detected. Please record again.");
        setIsProcessing(false);
        return;
      }

      const preview = await aiNotesService.previewVoiceEdit(
        sessionId,
        result.blob,
        result.fileName,
      );

      reset();
      onOpenChange(false);
      onPreviewReady(preview);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Unable to process the voice instruction.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isProcessing && onOpenChange(next)}>
      <DialogContent className="max-w-md rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="border-b border-gray-100 px-6 py-4">
          <DialogTitle>Voice Edit</DialogTitle>
          <DialogDescription>
            Speak a short instruction such as “Change diagnosis to Acute
            Pulpitis” or “Remove Amoxicillin”.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6">
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                "flex h-24 w-24 items-center justify-center rounded-full transition-colors",
                isRecording
                  ? "bg-red-600 shadow-lg shadow-red-200"
                  : "bg-teal-600 shadow-lg shadow-teal-200",
              )}
            >
              {isProcessing ? (
                <Loader2 className="h-9 w-9 animate-spin text-white" />
              ) : (
                <Mic className="h-9 w-9 text-white" />
              )}
            </div>

            <div className="text-center">
              <p className="font-mono text-2xl font-semibold text-gray-800">
                {formatTimer(elapsedSeconds)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {isProcessing
                  ? "Processing instruction..."
                  : isRecording
                    ? "Listening..."
                    : "Ready to record"}
              </p>
            </div>

            {(isRecording || isProcessing) && (
              <div className="flex h-10 items-end gap-1">
                {Array.from({ length: 16 }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "w-1.5 rounded-full bg-teal-500/80",
                      isRecording && "animate-pulse",
                    )}
                    style={{
                      height: `${10 + ((index * 7) % 24)}px`,
                      animationDelay: `${index * 40}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            {!isRecording && !isProcessing && (
              <Button
                type="button"
                className="rounded-xl bg-teal-600 hover:bg-teal-700"
                onClick={handleStart}
              >
                <Mic className="mr-2 h-4 w-4" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button
                type="button"
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
                onClick={handleStopAndProcess}
                disabled={isProcessing}
              >
                <Square className="mr-2 h-4 w-4" />
                Stop & Process
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={handleClose}
              disabled={isProcessing}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
