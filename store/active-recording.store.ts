"use client";

import { create } from "zustand";

type StopAndCompleteHandler = () => Promise<void>;

interface ActiveRecordingState {
  sessionId: string | null;
  isLocallyRecording: boolean;
  /** Live elapsed seconds for the active local recording (sidebar sync). */
  elapsedSeconds: number;
  stopAndCompleteHandler: StopAndCompleteHandler | null;
  setLocalRecordingState: (
    sessionId: string,
    isLocallyRecording: boolean,
    elapsedSeconds?: number,
  ) => void;
  registerStopHandler: (
    sessionId: string,
    handler: StopAndCompleteHandler,
  ) => void;
  clearSession: (sessionId: string) => void;
  stopAndComplete: () => Promise<void>;
  isSessionLocallyRecording: (sessionId: string) => boolean;
  hasActiveLocalRecording: (excludeSessionId?: string) => boolean;
}

export const useActiveRecordingStore = create<ActiveRecordingState>(
  (set, get) => ({
    sessionId: null,
    isLocallyRecording: false,
    elapsedSeconds: 0,
    stopAndCompleteHandler: null,

    setLocalRecordingState: (sessionId, isLocallyRecording, elapsedSeconds) => {
      set({
        sessionId,
        isLocallyRecording,
        elapsedSeconds:
          typeof elapsedSeconds === "number"
            ? elapsedSeconds
            : get().sessionId === sessionId
              ? get().elapsedSeconds
              : 0,
      });
    },

    registerStopHandler: (sessionId, handler) => {
      const current = get();
      set({
        sessionId,
        stopAndCompleteHandler: handler,
        // Keep recording flag when re-registering for the same session.
        isLocallyRecording:
          current.sessionId === sessionId ? current.isLocallyRecording : false,
        elapsedSeconds:
          current.sessionId === sessionId ? current.elapsedSeconds : 0,
      });
    },

    clearSession: (sessionId) => {
      const current = get();
      if (current.sessionId !== sessionId) return;
      set({
        sessionId: null,
        isLocallyRecording: false,
        elapsedSeconds: 0,
        stopAndCompleteHandler: null,
      });
    },

    stopAndComplete: async () => {
      const { stopAndCompleteHandler } = get();
      if (!stopAndCompleteHandler) {
        throw new Error(
          "No active recording controller is available to stop and save.",
        );
      }
      await stopAndCompleteHandler();
    },

    isSessionLocallyRecording: (sessionId) => {
      const current = get();
      return current.sessionId === sessionId && current.isLocallyRecording;
    },

    hasActiveLocalRecording: (excludeSessionId) => {
      const current = get();
      if (!current.isLocallyRecording || !current.sessionId) return false;
      if (excludeSessionId && current.sessionId === excludeSessionId) {
        return false;
      }
      return true;
    },
  }),
);

export const isRecordingNavigationBlocked = (
  sessionStatus?: string | null,
  isLocallyRecording = false,
) => sessionStatus === "recording" || isLocallyRecording;
