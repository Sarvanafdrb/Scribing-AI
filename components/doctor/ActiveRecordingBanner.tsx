"use client";

import Link from "next/link";
import { Mic, ArrowRight } from "lucide-react";
import { useActiveRecordingStore } from "@/store/active-recording.store";
import { cn } from "@/lib/utils";

export function ActiveRecordingBanner() {
  const sessionId = useActiveRecordingStore((state) => state.sessionId);
  const isLocallyRecording = useActiveRecordingStore(
    (state) => state.isLocallyRecording,
  );

  if (!isLocallyRecording || !sessionId) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-red-500/30",
        "bg-red-500/10 px-4 py-3 text-sm text-foreground",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <Mic className="h-4 w-4 text-red-500" />
        <span className="font-medium">
          Recording in progress — return to the active consultation to continue
          or stop safely.
        </span>
      </div>
      <Link
        href={`/doctor/workspace/${sessionId}`}
        className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
      >
        Return to consultation
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
