"use client";

import { create } from "zustand";

type StopAndCompleteHandler = () => Promise<void>;

interface ActiveRecordingState {
  sessionId: string | null;
  isLocallyRecording: boolean;
  stopAndCompleteHandler: StopAndCompleteHandler | null;
  setLocalRecordingState: (
    sessionId: string,
    isLocallyRecording: boolean,
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
    stopAndCompleteHandler: null,

    setLocalRecordingState: (sessionId, isLocallyRecording) => {
      set({
        sessionId,
        isLocallyRecording,
      });
    },

    registerStopHandler: (sessionId, handler) => {
      set({
        sessionId,
        stopAndCompleteHandler: handler,
      });
    },

    clearSession: (sessionId) => {
      const current = get();
      if (current.sessionId !== sessionId) return;
      set({
        sessionId: null,
        isLocallyRecording: false,
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
