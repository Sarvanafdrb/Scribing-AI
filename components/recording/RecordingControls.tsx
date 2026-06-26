"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecordingState } from "@/types/recording.types";
import { Mic, Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordingControlsProps {
  state: RecordingState;
  elapsedSeconds: number;
  isUploading?: boolean;
  controlsLocked?: boolean;
  showStart?: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
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
  controlsLocked = false,
  showStart = true,
  onStart,
  onPause,
  onResume,
  onStop,
}: RecordingControlsProps) {
  const locked = isUploading || controlsLocked;
  const isIdle = state === "idle";

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div
          className={cn(
            "text-6xl font-mono font-bold tracking-tight",
            state === "recording" ? "text-red-600" : "text-slate-800",
          )}
        >
          {formatTime(elapsedSeconds)}
        </div>

        {state === "recording" && (
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
            <Badge className="bg-red-600 hover:bg-red-600">Recording</Badge>
          </div>
        )}

        {state === "paused" && (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
            Paused
          </Badge>
        )}

        {isIdle && !locked && (
          <p className="text-sm font-medium text-slate-600">Ready to Record</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {isIdle && showStart && !locked && (
          <Button
            size="lg"
            className="h-16 min-w-[240px] rounded-xl bg-red-600 px-10 text-lg font-semibold shadow-md hover:bg-red-700"
            onClick={onStart}
            disabled={isUploading}
          >
            <Mic className="mr-3 h-6 w-6" />
            Start Recording
          </Button>
        )}

        {state === "recording" && !locked && (
          <>
            <Button size="lg" variant="outline" className="h-12 px-6" onClick={onPause}>
              <Pause className="mr-2 h-5 w-5" />
              Pause
            </Button>
            <Button
              size="lg"
              className="h-12 bg-blue-600 px-6 hover:bg-blue-700"
              onClick={onStop}
              disabled={isUploading}
            >
              <Square className="mr-2 h-5 w-5" />
              Stop
            </Button>
          </>
        )}

        {state === "paused" && !locked && (
          <>
            <Button
              size="lg"
              className="h-12 bg-green-600 px-6 hover:bg-green-700"
              onClick={onResume}
            >
              <Play className="mr-2 h-5 w-5" />
              Resume
            </Button>
            <Button
              size="lg"
              className="h-12 bg-blue-600 px-6 hover:bg-blue-700"
              onClick={onStop}
              disabled={isUploading}
            >
              <Square className="mr-2 h-5 w-5" />
              Stop
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
