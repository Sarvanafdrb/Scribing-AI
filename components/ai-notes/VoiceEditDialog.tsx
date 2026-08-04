"use client";

import { useEffect, useRef, useState } from "react";
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
  const { state, elapsedSeconds, error, start, stop, reset } =
    useMediaRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);

  const isRecording = state === "recording" || state === "paused";

  useEffect(() => {
    if (!open && !isProcessingRef.current) {
      reset();
      setIsProcessing(false);
    }
  }, [open, reset]);

  const setProcessing = (value: boolean) => {
    isProcessingRef.current = value;
    setIsProcessing(value);
  };

  const handleClose = () => {
    if (isProcessingRef.current) return;
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
      setProcessing(true);
      const result = await stop();

      if (!result.blob || result.blob.size < 256) {
        toast.error("No speech detected. Please record again.");
        setProcessing(false);
        return;
      }

      const preview = await aiNotesService.previewVoiceEdit(
        sessionId,
        result.blob,
        result.fileName,
      );

      // Hand off to review BEFORE closing — keeps parent Preview open
      // (nested Radix dialogs otherwise dismiss the Preview modal).
      onPreviewReady(preview);
      reset();
      setProcessing(false);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (
          err as {
            response?: { data?: { message?: string } };
            message?: string;
          }
        )?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Unable to process the voice instruction.";
      toast.error(message);
      setProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isProcessingRef.current) return;
        if (!next) {
          reset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        data-voice-edit=""
        overlayClassName="z-[70]"
        className="z-[80] max-w-md rounded-2xl p-0 sm:max-w-md"
        onPointerDownOutside={(event) => {
          if (isProcessingRef.current || isRecording) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (isProcessingRef.current || isRecording) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="border-b border-border/50 px-6 py-4">
          <DialogTitle>Voice Edit</DialogTitle>
          <DialogDescription>
            Speak a short instruction such as “Change diagnosis to Acute
            Pulpitis” or “Remove Amoxicillin”. After stop, review and Accept to
            save.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6">
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                "flex h-24 w-24 items-center justify-center rounded-full transition-colors",
                isRecording
                  ? "bg-red-600 shadow-lg shadow-red-200/40"
                  : "bg-primary shadow-glow",
              )}
            >
              {isProcessing ? (
                <Loader2 className="h-9 w-9 animate-spin text-primary-foreground" />
              ) : (
                <Mic className="h-9 w-9 text-primary-foreground" />
              )}
            </div>

            <div className="text-center">
              <p className="font-mono text-2xl font-semibold text-foreground">
                {formatTimer(elapsedSeconds)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isProcessing
                  ? "Processing instruction..."
                  : isRecording
                    ? "Listening... tap Stop & Process when done"
                    : "Ready to record"}
              </p>
            </div>

            {(isRecording || isProcessing) && (
              <div className="flex h-10 items-end gap-1">
                {Array.from({ length: 16 }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "w-1.5 rounded-full bg-primary/80",
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
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            {!isRecording && !isProcessing && (
              <Button
                type="button"
                className="rounded-xl"
                onClick={handleStart}
              >
                <Mic className="mr-2 h-4 w-4" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button
                type="button"
                className="rounded-xl bg-primary text-primary-foreground"
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
