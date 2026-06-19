"use client";

import { useEffect, useState } from "react";
import { recordingService, resolveAudioUrl } from "@/services/recording.service";
import { Loader2 } from "lucide-react";

interface AudioPlaybackProps {
  sessionId?: string;
  audioUrl?: string;
  title?: string;
}

export function AudioPlayback({
  sessionId,
  audioUrl,
  title = "Recording Playback",
}: AudioPlaybackProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPlaybackUrl = async () => {
      if (!sessionId && !audioUrl) return;

      setIsLoading(true);
      setError(null);

      try {
        if (sessionId) {
          const result = await recordingService.getPlaybackUrl(sessionId);
          if (active) {
            setSrc(resolveAudioUrl(result.playbackUrl));
          }
          return;
        }

        if (audioUrl && active) {
          setSrc(resolveAudioUrl(audioUrl));
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load audio");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadPlaybackUrl();

    return () => {
      active = false;
    };
  }, [sessionId, audioUrl]);

  if (!sessionId && !audioUrl) {
    return null;
  }

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

  if (!src) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <audio controls className="w-full" src={src}>
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}
