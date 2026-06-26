"use client";

import { Button } from "@/components/ui/button";
import { Session } from "@/types/session.types";
import { TranscriptData } from "@/types/transcript.types";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface RecordingPipelineProgressProps {
  session: Session;
  transcript?: TranscriptData | null;
  isUploading?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
}

type PipelineStep = "stopped" | "uploading" | "processing" | "completed";

const STEPS: { key: PipelineStep; label: string }[] = [
  { key: "stopped", label: "Recording Saved" },
  { key: "uploading", label: "Uploading Audio..." },
  { key: "processing", label: "Generating Transcript..." },
  { key: "completed", label: "Transcript Ready" },
];

const getActiveStep = (
  status: Session["status"],
  isUploading = false,
): PipelineStep => {
  if (isUploading || status === "uploading") return "uploading";
  if (status === "processing") return "processing";
  if (status === "completed") return "completed";
  if (status === "failed") return "processing";
  return "stopped";
};

const getStepState = (
  step: PipelineStep,
  activeStep: PipelineStep,
  sessionStatus: Session["status"],
  isUploading = false,
) => {
  const stepOrder: PipelineStep[] = [
    "stopped",
    "uploading",
    "processing",
    "completed",
  ];
  const stepIndex = stepOrder.indexOf(step);
  const activeIndex = stepOrder.indexOf(activeStep);

  if (sessionStatus === "failed") {
    if (stepIndex < stepOrder.indexOf("processing")) return "done";
    if (step === "processing") return "error";
    return "pending";
  }

  if (isUploading && step === "stopped") return "done";
  if (stepIndex < activeIndex) return "done";
  if (stepIndex === activeIndex) return "active";
  return "pending";
};

export function RecordingPipelineProgress({
  session,
  transcript,
  isUploading = false,
  isRetrying = false,
  onRetry,
}: RecordingPipelineProgressProps) {
  const activeStep = getActiveStep(session.status, isUploading);
  const isFailed = session.status === "failed";
  const errorMessage =
    transcript?.metadata.error ||
    session.transcriptData?.metadata?.error ||
    "Transcription failed. Please try again.";

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
      <div className="space-y-3">
        {STEPS.map((step) => {
          const state = getStepState(
            step.key,
            activeStep,
            session.status,
            isUploading,
          );

          return (
            <div key={step.key} className="flex items-center gap-3 text-sm">
              {state === "done" && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
              )}
              {state === "active" && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
              )}
              {state === "error" && (
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              {state === "pending" && (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              )}
              <span
                className={cn(
                  state === "active" && "font-medium text-blue-700",
                  state === "done" && "text-muted-foreground",
                  state === "error" && "font-medium text-destructive",
                  state === "pending" && "text-muted-foreground/70",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {isFailed && (
        <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{errorMessage}</p>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              disabled={isRetrying || !session.audioUrl}
            >
              {isRetrying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Retry Transcript
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
