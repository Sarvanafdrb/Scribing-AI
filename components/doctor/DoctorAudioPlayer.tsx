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
}

function formatPlaybackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export function DoctorAudioPlayer({
  sessionId,
  audioUrl,
  audioPlaybackUrl,
}: DoctorAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] =
    useState<(typeof PLAYBACK_SPEEDS)[number]>(1);

  useEffect(() => {
    let active = true;

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

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime || 0);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => setError("No recording available.")}
      />

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
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            aria-label="Seek"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-teal-600"
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
