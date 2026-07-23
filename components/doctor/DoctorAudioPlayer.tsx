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
  /** Server-recorded length in seconds; used when the browser cannot read metadata yet. */
  knownDuration?: number | null;
}

function isValidDuration(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds >= 0;
}

function formatPlaybackTime(seconds: number | null) {
  if (seconds === null || !isValidDuration(seconds)) return "--:--";

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = (total % 60).toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs}`;
  }

  return `${mins}:${secs}`;
}

function readAudioDuration(audio: HTMLAudioElement): number | null {
  const { duration } = audio;
  if (!isValidDuration(duration)) return null;
  return duration;
}

export function DoctorAudioPlayer({
  sessionId,
  audioUrl,
  audioPlaybackUrl,
  knownDuration,
}: DoctorAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const durationProbeRef = useRef(false);
  const hasDurationRef = useRef(false);
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] =
    useState<(typeof PLAYBACK_SPEEDS)[number]>(1);

  const applyDuration = useCallback((next: number | null) => {
    if (next === null || !isValidDuration(next)) return;
    hasDurationRef.current = true;
    setDuration((prev) =>
      prev !== null && Math.abs(prev - next) < 0.05 ? prev : next,
    );
  }, []);

  useEffect(() => {
    let active = true;

    setSrc(null);
    setCurrentTime(0);
    hasDurationRef.current = false;
    durationProbeRef.current = false;
    setDuration(null);
    setIsPlaying(false);
    setError(null);

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
  }, [sessionId, audioUrl, audioPlaybackUrl]);

  useEffect(() => {
    // Seed duration from the session record when the browser has not resolved it yet.
    if (hasDurationRef.current) return;
    if (knownDuration == null || !isValidDuration(knownDuration) || knownDuration <= 0) {
      return;
    }
    applyDuration(knownDuration);
  }, [knownDuration, applyDuration, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    const syncDurationFromElement = () => {
      const resolved = readAudioDuration(audio);
      if (resolved !== null) {
        applyDuration(resolved);
        return true;
      }
      return false;
    };

    /**
     * MediaRecorder WebM often reports Infinity until the browser seeks near EOF.
     * Force a one-shot probe so duration is available before the user presses Play.
     */
    const probeUnknownDuration = () => {
      if (durationProbeRef.current) return;
      if (syncDurationFromElement()) return;
      if (audio.duration !== Infinity) return;

      durationProbeRef.current = true;
      const wasPaused = audio.paused;
      const previousTime = audio.currentTime;

      const onTimeUpdate = () => {
        if (!isValidDuration(audio.duration)) return;

        audio.removeEventListener("timeupdate", onTimeUpdate);
        applyDuration(audio.duration);

        if (wasPaused) {
          audio.currentTime = 0;
        } else {
          audio.currentTime = previousTime;
        }
      };

      audio.addEventListener("timeupdate", onTimeUpdate);

      try {
        audio.currentTime = 1e101;
      } catch {
        audio.removeEventListener("timeupdate", onTimeUpdate);
        durationProbeRef.current = false;
      }
    };

    const handleLoadedMetadata = () => {
      if (!syncDurationFromElement()) {
        probeUnknownDuration();
      }
    };

    const handleDurationChange = () => {
      syncDurationFromElement();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      if (!hasDurationRef.current) {
        syncDurationFromElement();
      }
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

    // Cached media may already have metadata before listeners attach.
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
  }, [src, applyDuration]);

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
            value={Math.min(currentTime, seekMax)}
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
