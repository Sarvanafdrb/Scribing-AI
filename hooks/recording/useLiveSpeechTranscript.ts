"use client";

import { useEffect, useRef } from "react";
import { transcriptService } from "@/services/transcript.service";
import {
  DEFAULT_LIVE_SPEECH_LANGUAGE,
  detectSpeechLanguageFromText,
  detectSpeakerSeed,
  inferLiveSpeaker,
  needsEnglishTranslation,
  type LiveSpeechLanguage,
} from "@/lib/live-transcript.utils";
import { useLiveTranscriptStore } from "@/store/live-transcript.store";
import type { TranscriptSpeaker } from "@/types/transcript.types";

type SpeechRecognitionCtor = new () => SpeechRecognition;

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
  const reassignSpeakers = useLiveTranscriptStore(
    (state) => state.reassignSpeakers,
  );
  const clear = useLiveTranscriptStore((state) => state.clear);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const elapsedRef = useRef(elapsedSeconds);
  const enabledRef = useRef(enabled);
  const sessionIdRef = useRef(sessionId);
  const interimIdRef = useRef<string | null>(null);
  const activeLangRef = useRef<LiveSpeechLanguage>(
    DEFAULT_LIVE_SPEECH_LANGUAGE,
  );
  const previousSpeakerRef = useRef<TranscriptSpeaker | null>(null);
  const sessionSeedRef = useRef<TranscriptSpeaker | null>(null);
  const segmentCountRef = useRef(0);
  const pendingLanguageSwitchRef = useRef<LiveSpeechLanguage | null>(null);

  elapsedRef.current = elapsedSeconds;
  enabledRef.current = enabled;
  sessionIdRef.current = sessionId;

  useEffect(() => {
    setSession(sessionId);
    previousSpeakerRef.current = null;
    sessionSeedRef.current = null;
    segmentCountRef.current = 0;
    activeLangRef.current = DEFAULT_LIVE_SPEECH_LANGUAGE;
    pendingLanguageSwitchRef.current = null;
  }, [sessionId, setSession]);

  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass || !enabled) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      interimIdRef.current = null;
      return;
    }

    const resolveSpeaker = (rawText: string) => {
      const speaker = inferLiveSpeaker(
        rawText,
        previousSpeakerRef.current,
        segmentCountRef.current,
        sessionSeedRef.current,
      );
      if (!sessionSeedRef.current) {
        const seed = detectSpeakerSeed(rawText);
        if (seed) {
          sessionSeedRef.current = seed;
        }
      }
      previousSpeakerRef.current = speaker;
      return speaker;
    };

    const requestEnglishTranslation = (segmentId: string, text: string) => {
      if (!needsEnglishTranslation(text)) {
        return;
      }

      void transcriptService
        .translateLiveLine(sessionIdRef.current, text)
        .then(({ translation }) => {
          if (!translation.trim()) return;
          updateLastSegment(segmentId, { translation: translation.trim() });
        })
        .catch(() => {
          // Live translation is best-effort during recording.
        });
    };

    const maybeSwitchLanguage = (rawText: string) => {
      const detected = detectSpeechLanguageFromText(rawText);
      if (detected === activeLangRef.current) return;
      pendingLanguageSwitchRef.current = detected;
      try {
        recognitionRef.current?.stop();
      } catch {
        // onend will restart with the detected language
      }
    };

    const upsertInterim = (rawText: string) => {
      const displayText = rawText.trim();
      if (!displayText) return;

      if (!interimIdRef.current) {
        const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        interimIdRef.current = id;
        appendSegment({
          id,
          start: elapsedRef.current,
          text: displayText,
          speaker: previousSpeakerRef.current ?? "doctor",
          isLive: true,
        });
        return;
      }

      updateLastSegment(interimIdRef.current, { text: displayText });
    };

    const finalizeSegment = (rawText: string) => {
      const displayText = rawText.trim();
      if (!displayText) return;

      const speaker = resolveSpeaker(displayText);
      let segmentId: string;

      if (interimIdRef.current) {
        segmentId = interimIdRef.current;
        updateLastSegment(segmentId, { text: displayText, speaker });
        interimIdRef.current = null;
      } else {
        segmentId = `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        appendSegment({
          id: segmentId,
          start: elapsedRef.current,
          text: displayText,
          speaker,
          isLive: true,
        });
      }

      segmentCountRef.current += 1;
      reassignSpeakers();
      const lastSegment =
        useLiveTranscriptStore.getState().segments.at(-1) ?? null;
      if (lastSegment) {
        previousSpeakerRef.current = lastSegment.speaker;
      }
      requestEnglishTranslation(segmentId, displayText);
      maybeSwitchLanguage(displayText);
    };

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = activeLangRef.current;
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

      if (pendingLanguageSwitchRef.current) {
        activeLangRef.current = pendingLanguageSwitchRef.current;
        pendingLanguageSwitchRef.current = null;
      }

      recognition.lang = activeLangRef.current;
      try {
        recognition.start();
      } catch {
        // ignore restart races
      }
    };

    recognition.onend = () => {
      startRecognition();
    };

    startRecognition();
    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
      interimIdRef.current = null;
      pendingLanguageSwitchRef.current = null;
    };
  }, [appendSegment, enabled, reassignSpeakers, sessionId, updateLastSegment]);

  useEffect(() => {
    if (!enabled) {
      interimIdRef.current = null;
    }
  }, [enabled]);

  return { clearLiveTranscript: clear };
};
