"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RecordingState } from "@/types/recording.types";
import { mrDiag, mrDiagStopCall } from "@/hooks/recording/mediaRecorderDiagnostics";
import {
  notifyRecorderStateChange,
  setRecordingDiagContext,
} from "@/hooks/recording/recordingFailureDiagnostics";
import {
  clearParkedMediaRecorder,
  parkMediaRecorder,
  takeParkedMediaRecorder,
} from "@/hooks/recording/mediaRecorderPark";

const FILE = "hooks/recording/useMediaRecorder.ts";

const getSupportedMimeType = (): string => {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
};

const getExtensionForMime = (mimeType: string): string => {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
};

export const useMediaRecorder = (options?: {
  sessionId?: string;
  onDataChunk?: (
    chunk: Blob,
    meta: { chunkIndex: number; mimeType: string },
  ) => void;
}) => {
  const sessionId = options?.sessionId;
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedTotalRef = useRef<number>(0);
  const pauseStartedAtRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const mimeTypeRef = useRef<string>("audio/webm");
  const previewUrlRef = useRef<string | null>(null);
  const stopReasonRef = useRef<string>("unknown");
  const chunkCountRef = useRef(0);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const onDataChunkRef = useRef(options?.onDataChunk);
  onDataChunkRef.current = options?.onDataChunk;
  const mountIdRef = useRef(
    `mr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const lastLoggedStateRef = useRef<string>("");
  const stateRef = useRef<RecordingState>(state);
  stateRef.current = state;

  // Log only when recorder state identity changes (avoid 1Hz spam from timer).
  const stateKey = `${state}|${mediaRecorderRef.current?.state ?? "none"}`;
  if (stateKey !== lastLoggedStateRef.current) {
    lastLoggedStateRef.current = stateKey;
    mrDiag("useMediaRecorder.stateChange", {
      mountId: mountIdRef.current,
      state,
      elapsedSeconds,
      recorderState: mediaRecorderRef.current?.state ?? null,
    });
  }

  // Diagnostics only — track React recorder state for unexpected idle dump.
  useEffect(() => {
    setRecordingDiagContext({
      recorderState: state,
      elapsedRecordingSeconds: elapsedSeconds,
      file: FILE,
      fn: "useMediaRecorder",
    });
    notifyRecorderStateChange(state, {
      file: FILE,
      fn: "useEffect[state]",
      details: {
        mountId: mountIdRef.current,
        mediaRecorderState: mediaRecorderRef.current?.state ?? null,
        elapsedSeconds,
        stopReason: stopReasonRef.current,
      },
    });
  }, [state]);

  useEffect(() => {
    setRecordingDiagContext({ elapsedRecordingSeconds: elapsedSeconds });
  }, [elapsedSeconds]);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const updateElapsed = useCallback(() => {
    if (!startedAtRef.current) return;
    const pausedExtra = isPausedRef.current
      ? Date.now() - pauseStartedAtRef.current
      : 0;
    const elapsed = Math.floor(
      (Date.now() -
        startedAtRef.current -
        pausedTotalRef.current -
        pausedExtra) /
        1000,
    );
    setElapsedSeconds(Math.max(0, elapsed));
  }, []);

  const stopStream = (reason: string) => {
    const recorder = mediaRecorderRef.current as
      | (MediaRecorder & { __mrDiagCleanup?: () => void })
      | null;
    recorder?.__mrDiagCleanup?.();

    const tracks = streamRef.current?.getTracks() ?? [];
    mrDiagStopCall(FILE, "stopStream", "~stopStream", {
      reason,
      mountId: mountIdRef.current,
      trackCount: tracks.length,
      trackStates: tracks.map((t) => ({
        kind: t.kind,
        readyState: t.readyState,
        enabled: t.enabled,
        muted: t.muted,
        label: t.label,
      })),
      recorderState: mediaRecorderRef.current?.state ?? null,
    });

    tracks.forEach((track) => {
      mrDiagStopCall(FILE, "audioTrack.stop", "track.stop()", {
        reason,
        trackKind: track.kind,
        trackReadyState: track.readyState,
        trackId: track.id,
        mountId: mountIdRef.current,
      });
      track.stop();
    });
    streamRef.current = null;
  };

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const reset = useCallback(() => {
    mrDiag("reset.called", { mountId: mountIdRef.current }, { trace: true });
    stopReasonRef.current = "reset()";
    if (sessionIdRef.current) {
      clearParkedMediaRecorder(sessionIdRef.current);
    }
    clearTimer();
    stopStream("reset()");
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = 0;
    pausedTotalRef.current = 0;
    pauseStartedAtRef.current = 0;
    isPausedRef.current = false;
    chunkCountRef.current = 0;
    setElapsedSeconds(0);
    setState("idle");
    setError(null);
    revokePreviewUrl();
    setPreviewUrl(null);
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      stopReasonRef.current = "not-stopped";
      chunkCountRef.current = 0;

      revokePreviewUrl();
      setPreviewUrl(null);

      mrDiag("start.getUserMedia", { mountId: mountIdRef.current });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      stream.getTracks().forEach((track) => {
        mrDiag("track.attached", {
          mountId: mountIdRef.current,
          trackId: track.id,
          kind: track.kind,
          readyState: track.readyState,
          label: track.label,
        });

        track.addEventListener("ended", () => {
          mrDiag(
            "track.ended",
            {
              mountId: mountIdRef.current,
              trackId: track.id,
              kind: track.kind,
              recorderState: mediaRecorderRef.current?.state ?? null,
              elapsedSecondsSinceStart: startedAtRef.current
                ? Math.floor((Date.now() - startedAtRef.current) / 1000)
                : null,
              note: "Browser/OS ended the MediaStreamTrack — MediaRecorder will typically stop next",
            },
            { trace: true },
          );
        });

        track.addEventListener("mute", () => {
          mrDiag("track.mute", {
            mountId: mountIdRef.current,
            trackId: track.id,
            recorderState: mediaRecorderRef.current?.state ?? null,
          });
        });

        track.addEventListener("unmute", () => {
          mrDiag("track.unmute", {
            mountId: mountIdRef.current,
            trackId: track.id,
            recorderState: mediaRecorderRef.current?.state ?? null,
          });
        });
      });

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType || "audio/webm";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.onstart = () => {
        mrDiag("MediaRecorder.onstart", {
          mountId: mountIdRef.current,
          state: recorder.state,
          mimeType: recorder.mimeType,
        });
      };

      recorder.ondataavailable = (event) => {
        chunkCountRef.current += 1;
        if (
          chunkCountRef.current <= 3 ||
          chunkCountRef.current % 30 === 0 ||
          event.data.size === 0
        ) {
          mrDiag("MediaRecorder.ondataavailable", {
            mountId: mountIdRef.current,
            chunkIndex: chunkCountRef.current,
            size: event.data.size,
            state: recorder.state,
            elapsedSecondsSinceStart: startedAtRef.current
              ? Math.floor((Date.now() - startedAtRef.current) / 1000)
              : null,
          });
        }
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          onDataChunkRef.current?.(event.data, {
            chunkIndex: chunkCountRef.current,
            mimeType: mimeTypeRef.current,
          });
        }
      };

      recorder.onpause = () => {
        mrDiag("MediaRecorder.onpause", {
          mountId: mountIdRef.current,
          state: recorder.state,
        });
      };

      recorder.onresume = () => {
        mrDiag("MediaRecorder.onresume", {
          mountId: mountIdRef.current,
          state: recorder.state,
        });
      };

      recorder.onstop = () => {
        mrDiag(
          "MediaRecorder.onstop",
          {
            mountId: mountIdRef.current,
            why: stopReasonRef.current,
            state: recorder.state,
            chunkCount: chunkCountRef.current,
            chunksBuffered: chunksRef.current.length,
            elapsedSecondsSinceStart: startedAtRef.current
              ? Math.floor((Date.now() - startedAtRef.current) / 1000)
              : null,
            trackStates: (streamRef.current?.getTracks() ?? []).map((t) => ({
              kind: t.kind,
              readyState: t.readyState,
              muted: t.muted,
            })),
          },
          { trace: true },
        );
      };

      recorder.onerror = (event) => {
        const errorEvent = event as Event & { error?: DOMException };
        mrDiag(
          "MediaRecorder.onerror",
          {
            mountId: mountIdRef.current,
            state: recorder.state,
            errorName: errorEvent.error?.name,
            errorMessage: errorEvent.error?.message,
            elapsedSecondsSinceStart: startedAtRef.current
              ? Math.floor((Date.now() - startedAtRef.current) / 1000)
              : null,
          },
          { trace: true },
        );
        stopReasonRef.current = `MediaRecorder.onerror:${errorEvent.error?.name || "unknown"}`;
        setError("Recording failed due to a media error.");
        clearTimer();
        stopStream("MediaRecorder.onerror handler");
        mediaRecorderRef.current = null;
        isPausedRef.current = false;
        setState("idle");
      };

      mrDiag("MediaRecorder.start(1000)", {
        mountId: mountIdRef.current,
        mimeType: mimeTypeRef.current,
      });
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      pausedTotalRef.current = 0;
      pauseStartedAtRef.current = 0;
      isPausedRef.current = false;
      setElapsedSeconds(0);
      setState("recording");

      clearTimer();
      timerRef.current = window.setInterval(updateElapsed, 1000);

      // Heartbeat + page lifecycle (diagnostic only — does not stop recording)
      const heartbeatId = window.setInterval(() => {
        const tracks = streamRef.current?.getTracks() ?? [];
        mrDiag("heartbeat", {
          mountId: mountIdRef.current,
          elapsedSecondsSinceStart: startedAtRef.current
            ? Math.floor((Date.now() - startedAtRef.current) / 1000)
            : null,
          recorderState: mediaRecorderRef.current?.state ?? null,
          chunkCount: chunkCountRef.current,
          visibility: document.visibilityState,
          trackStates: tracks.map((t) => ({
            readyState: t.readyState,
            muted: t.muted,
            enabled: t.enabled,
          })),
        });
      }, 30000);

      const onVisibility = () => {
        mrDiag("document.visibilitychange", {
          mountId: mountIdRef.current,
          visibility: document.visibilityState,
          recorderState: mediaRecorderRef.current?.state ?? null,
          elapsedSecondsSinceStart: startedAtRef.current
            ? Math.floor((Date.now() - startedAtRef.current) / 1000)
            : null,
        });
      };
      const onPageHide = () => {
        mrDiag(
          "window.pagehide",
          {
            mountId: mountIdRef.current,
            recorderState: mediaRecorderRef.current?.state ?? null,
            elapsedSecondsSinceStart: startedAtRef.current
              ? Math.floor((Date.now() - startedAtRef.current) / 1000)
              : null,
          },
          { trace: true },
        );
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pagehide", onPageHide);

      // Stash removers on the recorder instance for cleanup via stop/unmount paths
      (recorder as MediaRecorder & { __mrDiagCleanup?: () => void }).__mrDiagCleanup =
        () => {
          window.clearInterval(heartbeatId);
          document.removeEventListener("visibilitychange", onVisibility);
          window.removeEventListener("pagehide", onPageHide);
        };
    } catch (err: any) {
      mrDiag(
        "start.failed",
        {
          mountId: mountIdRef.current,
          message: err?.message,
        },
        { trace: true },
      );
      setError(
        err?.message ||
          "Microphone access denied. Please allow microphone permission.",
      );
      stopStream("start() catch after getUserMedia failure");
      setState("idle");
    }
  }, [updateElapsed]);

  const pause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    mrDiag("pause.called", { mountId: mountIdRef.current });
    recorder.pause();
    pauseStartedAtRef.current = Date.now();
    isPausedRef.current = true;
    clearTimer();
    setState("paused");
  }, []);

  const resume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;

    mrDiag("resume.called", { mountId: mountIdRef.current });
    pausedTotalRef.current += Date.now() - pauseStartedAtRef.current;
    isPausedRef.current = false;
    recorder.resume();
    setState("recording");
    clearTimer();
    timerRef.current = window.setInterval(updateElapsed, 1000);
  }, [updateElapsed]);

  const stop = useCallback(async (): Promise<{
    blob: Blob;
    duration: number;
    fileName: string;
    mimeType: string;
  }> => {
    // Prefer live ref; if remount left the recorder parked, reclaim it.
    let recorder = mediaRecorderRef.current;
    if (!recorder && sessionIdRef.current) {
      const parked = takeParkedMediaRecorder(sessionIdRef.current);
      if (parked) {
        mediaRecorderRef.current = parked.mediaRecorder;
        streamRef.current = parked.stream;
        chunksRef.current = parked.chunks;
        mimeTypeRef.current = parked.mimeType;
        startedAtRef.current = parked.startedAt;
        pausedTotalRef.current = parked.pausedTotal;
        pauseStartedAtRef.current = parked.pauseStartedAt;
        isPausedRef.current = parked.isPaused;
        chunkCountRef.current = parked.chunkCount;
        recorder = parked.mediaRecorder;
      }
    }

    if (!recorder) {
      throw new Error("No active recording");
    }

    if (sessionIdRef.current) {
      // Drop any stale park entry without stopping the live recorder we are about to stop.
      const parked = takeParkedMediaRecorder(sessionIdRef.current);
      if (parked && parked.mediaRecorder !== recorder) {
        try {
          parked.stream.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore
        }
      }
    }

    stopReasonRef.current = "user/stop() explicit call";
    mrDiagStopCall(FILE, "stop", "recorder.stop()", {
      mountId: mountIdRef.current,
      reason: stopReasonRef.current,
      recorderStateBefore: recorder.state,
      elapsedSecondsSinceStart: startedAtRef.current
        ? Math.floor((Date.now() - startedAtRef.current) / 1000)
        : null,
      chunkCount: chunkCountRef.current,
    });

    clearTimer();

    // Browsers can drop the final stop if we call stop() while paused.
    if (recorder.state === "paused") {
      pausedTotalRef.current += Date.now() - pauseStartedAtRef.current;
      isPausedRef.current = false;
      try {
        recorder.resume();
      } catch {
        // continue to stop anyway
      }
      await new Promise((r) => window.setTimeout(r, 50));
    }

    // Flush the current timeslice so the last audio is in chunks before stop.
    try {
      if (recorder.state === "recording") {
        recorder.requestData();
      }
    } catch {
      // ignore
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      let settled = false;
      const finish = (finalBlob: Blob) => {
        if (settled) return;
        settled = true;
        resolve(finalBlob);
      };

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      const timeoutId = window.setTimeout(() => {
        // Don't hang forever on long recordings — assemble whatever we have.
        const mimeType = mimeTypeRef.current || "audio/webm";
        finish(new Blob(chunksRef.current, { type: mimeType }));
      }, 15000);

      const previousOnStop = recorder.onstop;
      recorder.onstop = (event) => {
        window.clearTimeout(timeoutId);
        try {
          previousOnStop?.call(recorder, event);
        } catch {
          // ignore previous handler errors
        }
        const mimeType = mimeTypeRef.current || "audio/webm";
        finish(new Blob(chunksRef.current, { type: mimeType }));
      };

      recorder.onerror = () => {
        window.clearTimeout(timeoutId);
        fail(new Error("Failed to stop recording"));
      };

      try {
        if (recorder.state === "inactive") {
          window.clearTimeout(timeoutId);
          const mimeType = mimeTypeRef.current || "audio/webm";
          finish(new Blob(chunksRef.current, { type: mimeType }));
          return;
        }
        recorder.stop();
      } catch (error) {
        window.clearTimeout(timeoutId);
        // Fall back to buffered chunks if stop() throws.
        const mimeType = mimeTypeRef.current || "audio/webm";
        if (chunksRef.current.length > 0) {
          finish(new Blob(chunksRef.current, { type: mimeType }));
        } else {
          fail(
            error instanceof Error
              ? error
              : new Error("Failed to stop recording"),
          );
        }
      }
    });

    stopStream("stop() after recorder.stop()");
    mediaRecorderRef.current = null;

    const duration = Math.max(
      0,
      Math.floor(
        (Date.now() - startedAtRef.current - pausedTotalRef.current) / 1000,
      ),
    );

    const mimeType = blob.type || mimeTypeRef.current || "audio/webm";
    const extension = getExtensionForMime(mimeType);
    const fileName = `recording-${Date.now()}.${extension}`;
    const objectUrl = URL.createObjectURL(blob);

    revokePreviewUrl();
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setState("stopped");
    setElapsedSeconds(duration);

    return { blob, duration, fileName, mimeType };
  }, []);

  // Cleanup / reclaim: park active recorder on remount instead of killing the mic.
  useEffect(() => {
    const mountId = mountIdRef.current;
    const reclaimSessionId = sessionIdRef.current;
    mrDiag("useMediaRecorder.mount", { mountId, sessionId: reclaimSessionId });

    if (reclaimSessionId) {
      const parked = takeParkedMediaRecorder(reclaimSessionId);
      if (parked) {
        mediaRecorderRef.current = parked.mediaRecorder;
        streamRef.current = parked.stream;
        chunksRef.current = parked.chunks;
        mimeTypeRef.current = parked.mimeType;
        startedAtRef.current = parked.startedAt;
        pausedTotalRef.current = parked.pausedTotal;
        pauseStartedAtRef.current = parked.pauseStartedAt;
        isPausedRef.current = parked.isPaused;
        chunkCountRef.current = parked.chunkCount;
        setState(parked.state);
        setError(null);

        // Re-bind chunk handler after remount.
        parked.mediaRecorder.ondataavailable = (event) => {
          chunkCountRef.current += 1;
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
            onDataChunkRef.current?.(event.data, {
              chunkIndex: chunkCountRef.current,
              mimeType: mimeTypeRef.current,
            });
          }
        };

        clearTimer();
        timerRef.current = window.setInterval(updateElapsed, 1000);
        updateElapsed();

        mrDiag("useMediaRecorder.reclaimedParked", {
          mountId,
          sessionId: reclaimSessionId,
          state: parked.state,
          chunkCount: parked.chunkCount,
        });
      }
    }

    return () => {
      const activeState = stateRef.current;
      const recorder = mediaRecorderRef.current;
      const stream = streamRef.current;
      const sid = sessionIdRef.current;
      const canPark =
        Boolean(sid) &&
        Boolean(recorder) &&
        Boolean(stream) &&
        (activeState === "recording" || activeState === "paused") &&
        recorder!.state !== "inactive";

      if (canPark && sid && recorder && stream) {
        clearTimer();
        parkMediaRecorder({
          sessionId: sid,
          mediaRecorder: recorder,
          stream,
          chunks: [...chunksRef.current],
          mimeType: mimeTypeRef.current,
          startedAt: startedAtRef.current,
          pausedTotal: pausedTotalRef.current,
          pauseStartedAt: pauseStartedAtRef.current,
          isPaused: isPausedRef.current,
          chunkCount: chunkCountRef.current,
          state: activeState,
          parkedAt: Date.now(),
        });
        // Detach React refs without stopping tracks.
        mediaRecorderRef.current = null;
        streamRef.current = null;
        mrDiag(
          "useMediaRecorder.unmount.parked",
          {
            mountId,
            sessionId: sid,
            state: activeState,
            note: "Active recording parked — mic kept alive across remount",
          },
          { trace: true },
        );
        return;
      }

      stopReasonRef.current = "useMediaRecorder unmount cleanup";
      mrDiag(
        "useMediaRecorder.unmount.cleanup",
        {
          mountId,
          reason: stopReasonRef.current,
          recorderState: mediaRecorderRef.current?.state ?? null,
          elapsedSecondsSinceStart: startedAtRef.current
            ? Math.floor((Date.now() - startedAtRef.current) / 1000)
            : null,
          note: "Component that owns useMediaRecorder unmounted — cleanup will stopStream()",
        },
        { trace: true },
      );
      clearTimer();
      stopStream("useMediaRecorder unmount cleanup");
      mediaRecorderRef.current = null;
      revokePreviewUrl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    elapsedSeconds,
    error,
    previewUrl,
    start,
    pause,
    resume,
    stop,
    reset,
    isRecording: state === "recording",
    isPaused: state === "paused",
    isStopped: state === "stopped",
  };
};
