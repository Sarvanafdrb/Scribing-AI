"use client";

import { useEffect, useRef } from "react";
import {
  inferLiveSpeaker,
  LIVE_SPEECH_LANGUAGES,
  splitLiveTranscriptText,
} from "@/lib/live-transcript.utils";
import {
  useLiveTranscriptStore,
} from "@/store/live-transcript.store";
import type { TranscriptSpeaker } from "@/types/transcript.types";

type SpeechRecognitionCtor = new () => SpeechRecognition;

const LANGUAGE_ROTATE_MS = 3000;

const getSpeechRecognition = (): SpeechRecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export const useLiveSpeechTranscript = (
  sessionId: string,
  enabled: boolean,
  elapsedSeconds: number,
) => {
  const setSession = useLiveTranscriptStore((state) => state.setSession);
  const appendSegment = useLiveTranscriptStore((state) => state.appendSegment);
  const updateLastSegment = useLiveTranscriptStore(
    (state) => state.updateLastSegment,
  );
  const clear = useLiveTranscriptStore((state) => state.clear);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const elapsedRef = useRef(elapsedSeconds);
  const enabledRef = useRef(enabled);
  const sessionIdRef = useRef(sessionId);
  const interimIdRef = useRef<string | null>(null);
  const langIndexRef = useRef(0);
  const rotateTimerRef = useRef<number | null>(null);
  const previousSpeakerRef = useRef<TranscriptSpeaker | null>(null);
  const segmentCountRef = useRef(0);

  elapsedRef.current = elapsedSeconds;
  enabledRef.current = enabled;
  sessionIdRef.current = sessionId;

  useEffect(() => {
    setSession(sessionId);
    previousSpeakerRef.current = null;
    segmentCountRef.current = 0;
    langIndexRef.current = 0;
  }, [sessionId, setSession]);

  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass || !enabled) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      interimIdRef.current = null;
      if (rotateTimerRef.current) {
        window.clearInterval(rotateTimerRef.current);
        rotateTimerRef.current = null;
      }
      return;
    }

    const assignSpeaker = (rawText: string) => {
      const speaker = inferLiveSpeaker(
        rawText,
        previousSpeakerRef.current,
        segmentCountRef.current,
      );
      previousSpeakerRef.current = speaker;
      return speaker;
    };

    const upsertInterim = (rawText: string) => {
      const { primary, translation } = splitLiveTranscriptText(rawText);
      const displayText = primary || rawText;

      if (!interimIdRef.current) {
        const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        interimIdRef.current = id;
        appendSegment({
          id,
          start: elapsedRef.current,
          text: displayText,
          translation,
          speaker: assignSpeaker(displayText),
          isLive: true,
        });
        return;
      }

      updateLastSegment(interimIdRef.current, {
        text: displayText,
        translation,
      });
    };

    const finalizeSegment = (rawText: string) => {
      const { primary, translation } = splitLiveTranscriptText(rawText);
      const displayText = primary || rawText;

      if (interimIdRef.current) {
        updateLastSegment(interimIdRef.current, {
          text: displayText,
          translation,
        });
        interimIdRef.current = null;
      } else {
        appendSegment({
          id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          start: elapsedRef.current,
          text: displayText,
          translation,
          speaker: assignSpeaker(displayText),
          isLive: true,
        });
      }

      segmentCountRef.current += 1;
    };

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LIVE_SPEECH_LANGUAGES[langIndexRef.current];
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript?.trim() || "";
        if (!transcript) continue;
        if (result.isFinal) {
          finalText = `${finalText} ${transcript}`.trim();
        } else {
          interimText = `${interimText} ${transcript}`.trim();
        }
      }

      if (interimText) {
        upsertInterim(interimText);
      }

      if (finalText) {
        finalizeSegment(finalText);
      }
    };

    recognition.onerror = (event: Event) => {
      const code = (event as Event & { error?: string }).error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        enabledRef.current = false;
      }
    };

    const startRecognition = () => {
      if (!enabledRef.current || sessionIdRef.current !== sessionId) return;
      recognition.lang = LIVE_SPEECH_LANGUAGES[langIndexRef.current];
      try {
        recognition.start();
      } catch {
        // ignore restart races
      }
    };

    recognition.onend = () => {
      startRecognition();
    };

    const rotateLanguage = () => {
      langIndexRef.current =
        (langIndexRef.current + 1) % LIVE_SPEECH_LANGUAGES.length;
      recognition.lang = LIVE_SPEECH_LANGUAGES[langIndexRef.current];
      try {
        recognition.stop();
      } catch {
        // onend will restart with the new language
      }
    };

    startRecognition();
    recognitionRef.current = recognition;
    rotateTimerRef.current = window.setInterval(
      rotateLanguage,
      LANGUAGE_ROTATE_MS,
    );

    return () => {
      if (rotateTimerRef.current) {
        window.clearInterval(rotateTimerRef.current);
        rotateTimerRef.current = null;
      }
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
      interimIdRef.current = null;
    };
  }, [appendSegment, enabled, sessionId, updateLastSegment]);

  useEffect(() => {
    if (!enabled) {
      interimIdRef.current = null;
    }
  }, [enabled]);

  return { clearLiveTranscript: clear };
};
