"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { recordingService, resolveAudioUrl } from "@/services/recording.service";
import { cn } from "@/lib/utils";

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const;

interface DoctorAudioPlayerProps {
  sessionId: string;
  audioUrl?: string;
  audioPlaybackUrl?: string | null;
  /** Server-recorded length in seconds — source of truth for display/seek. */
  knownDuration?: number | null;
}

/** Backend duration is usable when finite and greater than zero. */
function isTrustedKnownDuration(
  seconds: number | null | undefined,
): seconds is number {
  return seconds != null && Number.isFinite(seconds) && seconds > 0;
}

function isValidBrowserDuration(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds > 0;
}

function formatPlaybackTime(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = (total % 60).toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs}`;
  }

  return `${mins}:${secs}`;
}

export function DoctorAudioPlayer({
  sessionId,
  audioUrl,
  audioPlaybackUrl,
  knownDuration,
}: DoctorAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trustedKnownRef = useRef(isTrustedKnownDuration(knownDuration));
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(
    isTrustedKnownDuration(knownDuration) ? knownDuration : null,
  );
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] =
    useState<(typeof PLAYBACK_SPEEDS)[number]>(1);

  trustedKnownRef.current = isTrustedKnownDuration(knownDuration);

  useEffect(() => {
    let active = true;

    setSrc(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setError(null);
    setDuration(
      isTrustedKnownDuration(knownDuration) ? knownDuration : null,
    );

    const loadPlaybackUrl = async () => {
      if (!audioUrl && !audioPlaybackUrl) return;

      setIsLoading(true);
      setError(null);

      try {
        if (audioPlaybackUrl) {
          if (active) {
            setSrc(resolveAudioUrl(audioPlaybackUrl));
          }
          return;
        }

        const result = await recordingService.getPlaybackUrl(sessionId);
        if (active) {
          setSrc(resolveAudioUrl(result.playbackUrl));
        }
      } catch (err: unknown) {
        if (audioUrl && active) {
          setSrc(resolveAudioUrl(audioUrl));
          return;
        }

        if (active) {
          const message =
            err &&
            typeof err === "object" &&
            "response" in err
              ? (err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message
              : undefined;
          setError(message || "Failed to load audio");
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
    // knownDuration intentionally omitted — applied in its own effect as source of truth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, audioUrl, audioPlaybackUrl]);

  // Backend duration is the source of truth whenever present.
  useEffect(() => {
    if (!isTrustedKnownDuration(knownDuration)) return;
    setDuration(knownDuration);
  }, [knownDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    /**
     * Only adopt browser metadata when we have no trusted backend duration.
     * Never overwrite session.duration with Infinity / NaN / 0 / wrong WebM values.
     */
    const syncDurationFromElement = () => {
      if (trustedKnownRef.current) return;
      if (!isValidBrowserDuration(audio.duration)) return;
      setDuration(audio.duration);
    };

    const handleLoadedMetadata = () => {
      syncDurationFromElement();
    };

    const handleDurationChange = () => {
      syncDurationFromElement();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      syncDurationFromElement();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => setError("No recording available.");

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      handleLoadedMetadata();
    } else {
      audio.load();
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, src]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      setError("Unable to play audio.");
    }
  }, []);

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (value > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
        Loading audio...
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
        {error}
      </p>
    );
  }

  if (!src) {
    return null;
  }

  const seekMax = duration != null && duration > 0 ? duration : 0;
  const progressPercent =
    duration != null && duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm transition-transform hover:bg-teal-700 active:scale-95"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-0.5" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            type="range"
            min={0}
            max={seekMax}
            step={0.1}
            value={Math.min(currentTime, seekMax || currentTime)}
            onChange={(e) => handleSeek(Number(e.target.value))}
            aria-label="Seek"
            disabled={seekMax <= 0}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: `linear-gradient(to right, #0d9488 ${progressPercent}%, #e5e7eb ${progressPercent}%)`,
            }}
          />
          <div className="flex justify-between font-mono text-[11px] text-gray-500">
            <span>{formatPlaybackTime(currentTime)}</span>
            <span>{formatPlaybackTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            aria-label="Volume"
            className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-gray-200 accent-teal-600"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Speed
          </span>
          {PLAYBACK_SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setPlaybackRate(speed)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                playbackRate === speed
                  ? "bg-teal-600 text-white"
                  : "bg-white text-gray-600 hover:bg-teal-50 hover:text-teal-700",
              )}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
