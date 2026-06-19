"use client";

import { Button } from "@/components/ui/button";
import { RecordingState } from "@/types/recording.types";
import { Mic, Pause, Play, Square, RotateCcw } from "lucide-react";

interface RecordingControlsProps {
  state: RecordingState;
  elapsedSeconds: number;
  isUploading?: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export function RecordingControls({
  state,
  elapsedSeconds,
  isUploading = false,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
}: RecordingControlsProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl font-mono font-bold text-blue-700">
          {formatTime(elapsedSeconds)}
        </div>
        <p className="mt-2 text-sm text-muted-foreground capitalize">
          {state === "idle" ? "Ready to record" : state}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {state === "idle" && (
          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-700"
            onClick={onStart}
            disabled={isUploading}
          >
            <Mic className="mr-2 h-5 w-5" />
            Start Recording
          </Button>
        )}

        {state === "recording" && (
          <>
            <Button size="lg" variant="outline" onClick={onPause}>
              <Pause className="mr-2 h-5 w-5" />
              Pause
            </Button>
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={onStop}
              disabled={isUploading}
            >
              <Square className="mr-2 h-5 w-5" />
              Stop
            </Button>
          </>
        )}

        {state === "paused" && (
          <>
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700"
              onClick={onResume}
            >
              <Play className="mr-2 h-5 w-5" />
              Resume
            </Button>
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={onStop}
              disabled={isUploading}
            >
              <Square className="mr-2 h-5 w-5" />
              Stop
            </Button>
          </>
        )}

        {state === "stopped" && (
          <Button size="lg" variant="outline" onClick={onReset}>
            <RotateCcw className="mr-2 h-5 w-5" />
            Record Again
          </Button>
        )}
      </div>
    </div>
  );
}
