"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RecordingState } from "@/types/recording.types";

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

export const useMediaRecorder = () => {
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
  const mimeTypeRef = useRef<string>("audio/webm");

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const updateElapsed = useCallback(() => {
    if (!startedAtRef.current) return;
    const pausedExtra =
      state === "paused"
        ? Date.now() - pauseStartedAtRef.current
        : 0;
    const elapsed = Math.floor(
      (Date.now() - startedAtRef.current - pausedTotalRef.current - pausedExtra) /
        1000,
    );
    setElapsedSeconds(Math.max(0, elapsed));
  }, [state]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const reset = useCallback(() => {
    clearTimer();
    stopStream();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = 0;
    pausedTotalRef.current = 0;
    pauseStartedAtRef.current = 0;
    setElapsedSeconds(0);
    setState("idle");
    setError(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const start = useCallback(async () => {
    try {
      setError(null);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType || "audio/webm";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      pausedTotalRef.current = 0;
      pauseStartedAtRef.current = 0;
      setElapsedSeconds(0);
      setState("recording");

      clearTimer();
      timerRef.current = window.setInterval(updateElapsed, 1000);
    } catch (err: any) {
      setError(
        err?.message ||
          "Microphone access denied. Please allow microphone permission.",
      );
      stopStream();
      setState("idle");
    }
  }, [previewUrl, updateElapsed]);

  const pause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.pause();
    pauseStartedAtRef.current = Date.now();
    clearTimer();
    setState("paused");
  }, []);

  const resume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;

    pausedTotalRef.current += Date.now() - pauseStartedAtRef.current;
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
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      throw new Error("No active recording");
    }

    clearTimer();

    if (recorder.state === "paused") {
      pausedTotalRef.current += Date.now() - pauseStartedAtRef.current;
      recorder.resume();
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const mimeType = mimeTypeRef.current || "audio/webm";
        const finalBlob = new Blob(chunksRef.current, { type: mimeType });
        resolve(finalBlob);
      };

      recorder.onerror = () => {
        reject(new Error("Failed to stop recording"));
      };

      recorder.stop();
    });

    stopStream();

    const duration = Math.max(
      elapsedSeconds,
      Math.floor(
        (Date.now() - startedAtRef.current - pausedTotalRef.current) / 1000,
      ),
    );

    const mimeType = blob.type || mimeTypeRef.current || "audio/webm";
    const extension = getExtensionForMime(mimeType);
    const fileName = `recording-${Date.now()}.${extension}`;
    const objectUrl = URL.createObjectURL(blob);

    setPreviewUrl(objectUrl);
    setState("stopped");
    setElapsedSeconds(duration);

    return { blob, duration, fileName, mimeType };
  }, [elapsedSeconds]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
