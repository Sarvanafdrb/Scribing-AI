"use client";

import { DoctorAudioPlayer } from "@/components/doctor/DoctorAudioPlayer";
import { resolveAudioUrl } from "@/services/recording.service";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface AudioPlaybackProps {
  sessionId?: string;
  audioUrl?: string;
  audioPlaybackUrl?: string | null;
  /** Server-recorded length in seconds — source of truth for the player. */
  knownDuration?: number | null;
  title?: string;
}

export function AudioPlayback({
  sessionId,
  audioUrl,
  audioPlaybackUrl,
  knownDuration,
  title = "Recording Playback",
}: AudioPlaybackProps) {
  // Prefer the shared player whenever we have a session id (correct duration).
  if (sessionId) {
    return (
      <div className="space-y-2">
        {title ? <p className="text-sm font-medium">{title}</p> : null}
        <DoctorAudioPlayer
          sessionId={sessionId}
          audioUrl={audioUrl}
          audioPlaybackUrl={audioPlaybackUrl}
          knownDuration={knownDuration}
        />
      </div>
    );
  }

  return (
    <LegacyAudioPlayback
      audioUrl={audioUrl}
      knownDuration={knownDuration}
      title={title}
    />
  );
}

/** Fallback when only a raw URL is available (no session id). */
function LegacyAudioPlayback({
  audioUrl,
  knownDuration,
  title,
}: {
  audioUrl?: string;
  knownDuration?: number | null;
  title?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!audioUrl) return;
      setIsLoading(true);
      setError(null);
      try {
        if (audioUrl.startsWith("s3://")) {
          throw new Error("Signed playback requires a session id");
        }
        if (active) {
          setSrc(resolveAudioUrl(audioUrl));
        }
      } catch (err: unknown) {
        if (active) {
          const message =
            err instanceof Error ? err.message : "Failed to load audio";
          setError(message);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [audioUrl]);

  if (!audioUrl) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading audio...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!src) return null;

  const durationLabel =
    knownDuration != null && Number.isFinite(knownDuration) && knownDuration > 0
      ? `${Math.floor(knownDuration / 60)}m ${Math.floor(knownDuration % 60)
          .toString()
          .padStart(2, "0")}s`
      : null;

  return (
    <div className="space-y-2">
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      {durationLabel ? (
        <p className="text-xs text-muted-foreground">Duration: {durationLabel}</p>
      ) : null}
      <audio
        controls
        className="w-full"
        src={src}
        preload="metadata"
        onError={() => setError("No recording available.")}
      >
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}
