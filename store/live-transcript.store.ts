"use client";

import { create } from "zustand";
import type { TranscriptSpeaker } from "@/types/transcript.types";
import { flipLiveSpeaker } from "@/lib/live-transcript.utils";

export interface LiveTranscriptSegment {
  id: string;
  start: number;
  text: string;
  translation?: string;
  speaker: TranscriptSpeaker;
  isLive: true;
}

interface LiveTranscriptState {
  sessionId: string | null;
  segments: LiveTranscriptSegment[];
  setSession: (sessionId: string) => void;
  appendSegment: (segment: LiveTranscriptSegment) => void;
  updateLastSegment: (
    id: string,
    patch: Partial<Pick<LiveTranscriptSegment, "text" | "translation" | "speaker">>,
  ) => void;
  flipAllSpeakers: () => void;
  clear: () => void;
}

export const useLiveTranscriptStore = create<LiveTranscriptState>((set, get) => ({
  sessionId: null,
  segments: [],

  setSession: (sessionId) => {
    const current = get();
    if (current.sessionId !== sessionId) {
      set({ sessionId, segments: [] });
    }
  },

  appendSegment: (segment) => {
    set((state) => ({
      segments: [...state.segments, segment],
    }));
  },

  updateLastSegment: (id, patch) => {
    set((state) => ({
      segments: state.segments.map((segment) =>
        segment.id === id ? { ...segment, ...patch } : segment,
      ),
    }));
  },

  flipAllSpeakers: () => {
    set((state) => ({
      segments: state.segments.map((segment) => ({
        ...segment,
        speaker: flipLiveSpeaker(segment.speaker),
      })),
    }));
  },

  clear: () => set({ sessionId: null, segments: [] }),
}));
