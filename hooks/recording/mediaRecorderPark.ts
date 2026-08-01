/**
 * Parks an in-progress MediaRecorder when React remounts the hook
 * (e.g. doctor layout briefly showing a loading spinner).
 * Prevents killing long consultations mid-recording.
 */

import type { RecordingState } from "@/types/recording.types";

export type ParkedMediaRecorder = {
  sessionId: string;
  mediaRecorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  mimeType: string;
  startedAt: number;
  pausedTotal: number;
  pauseStartedAt: number;
  isPaused: boolean;
  chunkCount: number;
  state: RecordingState;
  parkedAt: number;
};

let parked: ParkedMediaRecorder | null = null;

export function parkMediaRecorder(runtime: ParkedMediaRecorder): void {
  // Replacing an older park for a different session — stop the old one.
  if (parked && parked.sessionId !== runtime.sessionId) {
    try {
      parked.stream.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
  }
  parked = { ...runtime, parkedAt: Date.now() };
}

export function takeParkedMediaRecorder(
  sessionId: string,
): ParkedMediaRecorder | null {
  if (!parked || parked.sessionId !== sessionId) return null;
  const current = parked;
  parked = null;
  return current;
}

export function clearParkedMediaRecorder(sessionId?: string): void {
  if (!parked) return;
  if (sessionId && parked.sessionId !== sessionId) return;
  try {
    if (parked.mediaRecorder.state !== "inactive") {
      parked.mediaRecorder.stop();
    }
  } catch {
    // ignore
  }
  try {
    parked.stream.getTracks().forEach((t) => t.stop());
  } catch {
    // ignore
  }
  parked = null;
}

export function hasParkedMediaRecorder(sessionId: string): boolean {
  return Boolean(parked && parked.sessionId === sessionId);
}
