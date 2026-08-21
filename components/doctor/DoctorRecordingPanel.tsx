"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mic, Pause, Play, Square } from "lucide-react";
import { useMediaRecorder } from "@/hooks/recording/useMediaRecorder";
import { mrDiag } from "@/hooks/recording/mediaRecorderDiagnostics";
import {
  recordDiagEvent,
  setRecordingDiagContext,
} from "@/hooks/recording/recordingFailureDiagnostics";
import { useSession } from "@/hooks/sessions/useSession";
import { useTranscript } from "@/hooks/transcript/useTranscript";
import { useTranscriptMutations } from "@/hooks/transcript/useTranscriptMutations";
import { useDoctorQueue } from "@/hooks/doctor/useDoctorQueue";
import { DoctorAudioPlayer } from "@/components/doctor/DoctorAudioPlayer";
import { RecordingPipelineProgress } from "@/components/recording/RecordingPipelineProgress";
import {
  ConsultationRecoveryBanner,
  UnfinishedConsultationDialog,
} from "@/components/doctor/ConsultationRecoveryUi";
import { recordingService } from "@/services/recording.service";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import { transcriptKeys } from "@/services/transcript.queries";
import { useActiveRecordingStore } from "@/store/active-recording.store";
import { useAuthStore } from "@/store/auth.store";
import {
  canStartRecording,
  isResumableRecording,
  isTranscriptAvailable,
  isUnexpectedInterruptStatus,
  shouldClearRecoveryForStatus,
} from "@/utils/session-status.utils";
import { cn } from "@/lib/utils";
import {
  getPatientAge,
  getPatientFullName,
} from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import {
  clearConsultationRecovery,
  getConsultationRecovery,
  mirrorRecoveryIndex,
  saveConsultationRecovery,
  type ConsultationRecoveryRecord,
} from "@/lib/consultation-recovery-db";
import {
  formatConsultationDuration,
  uploadAudioSegment,
} from "@/lib/recording-segment-upload";

type WorkflowPhase = "ready" | "recording" | "postStop";

interface DoctorRecordingPanelProps {
  sessionId: string;
  onRecordingStateChange?: (state: {
    isRecording: boolean;
    elapsedSeconds: number;
  }) => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export function DoctorRecordingPanel({
  sessionId,
  onRecordingStateChange,
}: DoctorRecordingPanelProps) {
  const queryClient = useQueryClient();
  const { data: session, isLoading, refetch } = useSession(sessionId);
  const { transcript, refetch: refetchTranscript } = useTranscript(sessionId);
  const { generateTranscript } = useTranscriptMutations(sessionId);
  const { sessions, getSessionId } = useDoctorQueue();

  const pendingChunksRef = useRef<Blob[]>([]);
  const pendingMimeRef = useRef("audio/webm");
  const recordingStartedAtRef = useRef<number | null>(null);
  const previousDurationRef = useRef(0);
  const recoveryCheckedRef = useRef(false);
  /** Set when doctor intentionally clicks Stop â€” blocks pagehide from creating recovery. */
  const intentionalStopRef = useRef(false);

  const handleDataChunk = useCallback((chunk: Blob, meta: { mimeType: string }) => {
    pendingChunksRef.current.push(chunk);
    pendingMimeRef.current = meta.mimeType || pendingMimeRef.current;
  }, []);

  const {
    state: recorderState,
    elapsedSeconds,
    error: recorderError,
    start: startRecorder,
    pause: pauseRecorder,
    resume: resumeRecorder,
    stop: stopRecorder,
  } = useMediaRecorder({
    sessionId,
    onDataChunk: handleDataChunk,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowPhase>("ready");
  const [previousDurationSeconds, setPreviousDurationSeconds] = useState(0);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [banner, setBanner] = useState<"interrupted" | "resumed" | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [aiNotesDraft, setAiNotesDraft] = useState<Record<
    string,
    unknown
  > | null>(null);

  const setLocalRecordingState = useActiveRecordingStore(
    (state) => state.setLocalRecordingState,
  );
  const registerStopHandler = useActiveRecordingStore(
    (state) => state.registerStopHandler,
  );
  const clearSession = useActiveRecordingStore((state) => state.clearSession);
  const hasActiveLocalRecording = useActiveRecordingStore(
    (state) => state.hasActiveLocalRecording,
  );

  const totalElapsedSeconds = previousDurationSeconds + elapsedSeconds;
  const segmentCount =
    session?.recordingSegments?.length ||
    (session?.audioUrl && !(session.recordingSegments?.length || 0) ? 1 : 0);

  useEffect(() => {
    previousDurationRef.current = previousDurationSeconds;
  }, [previousDurationSeconds]);

  useEffect(() => {
    mrDiag("DoctorRecordingPanel.mount", {
      sessionId,
      sessionStatus: session?.status ?? null,
    });
    recordDiagEvent("DoctorRecordingPanel.mount", {
      file: "components/doctor/DoctorRecordingPanel.tsx",
      fn: "mount",
      sessionStatus: session?.status ?? null,
      details: { sessionId },
    });
    return () => {
      mrDiag(
        "DoctorRecordingPanel.unmount",
        {
          sessionId,
          sessionStatus: session?.status ?? null,
          recorderState,
          elapsedSeconds,
          workflow,
          note: "Unmount will trigger useMediaRecorder cleanup â†’ stopStream()",
        },
        { trace: true },
      );
      recordDiagEvent("DoctorRecordingPanel.unmount", {
        file: "components/doctor/DoctorRecordingPanel.tsx",
        fn: "unmount",
        recorderState,
        workflowState: workflow,
        sessionStatus: session?.status ?? null,
        elapsedRecordingSeconds: elapsedSeconds,
        details: { sessionId },
        includeStack: true,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    setRecordingDiagContext({
      workflowState: workflow,
      sessionStatus: session?.status ?? null,
      recorderState,
      elapsedRecordingSeconds: totalElapsedSeconds,
      file: "components/doctor/DoctorRecordingPanel.tsx",
      fn: "DoctorRecordingPanel",
    });
  }, [workflow, session?.status, recorderState, totalElapsedSeconds]);

  useEffect(() => {
    setWorkflow("ready");
    setIsUploading(false);
    setBanner(null);
    setShowRecoveryDialog(false);
    recoveryCheckedRef.current = false;
    intentionalStopRef.current = false;
    pendingChunksRef.current = [];
    recordingStartedAtRef.current = null;
    setPreviousDurationSeconds(0);
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    if (workflow === "recording" || workflow === "postStop") return;
    const hasSegments = (session.recordingSegments?.length || 0) > 0;
    if (session.audioUrl || hasSegments) {
      if (isResumableRecording(session.status)) {
        setWorkflow("ready");
      } else {
        setWorkflow("postStop");
      }
    } else {
      setWorkflow("ready");
    }
  }, [session?.audioUrl, session?.recordingSegments, session, sessionId, workflow]);

  const clearAllRecovery = useCallback(async () => {
    await clearConsultationRecovery(sessionId).catch(() => undefined);
    mirrorRecoveryIndex(sessionId, null);
    setShowRecoveryDialog(false);
    setBanner(null);
  }, [sessionId]);

  // Backend is source of truth: clear stale recovery once upload/pipeline starts.
  useEffect(() => {
    if (!session?.status) return;
    if (!shouldClearRecoveryForStatus(session.status)) return;

    void clearAllRecovery();
    setPreviousDurationSeconds(0);
    pendingChunksRef.current = [];
    recordingStartedAtRef.current = null;
    intentionalStopRef.current = true;
    setShowRecoveryDialog(false);
    setBanner(null);
  }, [session?.status, clearAllRecovery]);

  useEffect(() => {
    // If MediaRecorder was parked and reclaimed, restore recording UI (no Resume popup).
    if (recorderState === "recording" || recorderState === "paused") {
      setWorkflow("recording");
      setShowRecoveryDialog(false);
      setBanner(null);
    }
  }, [recorderState]);

  // Detect unexpected interruption ONLY â€” never during normal Stop â†’ upload â†’ processing.
  useEffect(() => {
    if (!session || recoveryCheckedRef.current) return;
    if (workflow === "recording" || isUploading) return;
    if (recorderState === "recording" || recorderState === "paused") return;
    if (intentionalStopRef.current) {
      recoveryCheckedRef.current = true;
      return;
    }

    let cancelled = false;
    (async () => {
      const fresh = await refetch().catch(() => ({ data: session }));
      const latest = fresh.data || session;
      if (cancelled) return;

      if (shouldClearRecoveryForStatus(latest.status)) {
        await clearAllRecovery();
        recoveryCheckedRef.current = true;
        return;
      }

      const local = await getConsultationRecovery(sessionId).catch(() => null);

      // Ignore recovery that does not belong to this exact session.
      if (local && local.sessionId !== sessionId) {
        await clearAllRecovery();
        recoveryCheckedRef.current = true;
        return;
      }

      if (!isUnexpectedInterruptStatus(latest.status)) {
        if (local) await clearAllRecovery();
        setPreviousDurationSeconds(0);
        recoveryCheckedRef.current = true;
        return;
      }

      const endedNormally =
        local?.recordingEndedNormally === true ||
        local?.recordingStatus === "stopped";

      // CRITICAL: Resume popup ONLY when a real interrupt was flagged (pagehide/crash),
      // or backend status is explicitly "interrupted".
      // Autosave alone must NEVER trigger this (that caused the 32s false popup).
      const hasUnexpectedRecovery =
        Boolean(local) &&
        local!.sessionId === sessionId &&
        !endedNormally &&
        (local!.needsResume === true || latest.status === "interrupted");

      recoveryCheckedRef.current = true;

      if (hasUnexpectedRecovery) {
        const previous = Math.max(
          latest.totalDuration || latest.duration || 0,
          local?.previousDurationSeconds || local?.elapsedSeconds || 0,
        );
        setPreviousDurationSeconds(previous);
        setBanner("interrupted");
        setShowRecoveryDialog(true);
        return;
      }

      // Active "recording" with draft autosave only â€” continue normally, no popup.
      setPreviousDurationSeconds(0);
      if (local && (endedNormally || local.needsResume !== true)) {
        // Keep draft chunks if still recording on backend, but never show resume UI.
        if (endedNormally || shouldClearRecoveryForStatus(latest.status)) {
          await clearAllRecovery();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, sessionId, workflow, isUploading, recorderState, refetch, clearAllRecovery]);

  const persistRecovery = useCallback(
    async (patch: Partial<ConsultationRecoveryRecord>) => {
      if (intentionalStopRef.current) return null;

      const existing = (await getConsultationRecovery(sessionId).catch(
        () => null,
      )) || {
        sessionId,
        recordingStatus: "idle" as const,
        recordingStartedAt: null,
        elapsedSeconds: 0,
        previousDurationSeconds: 0,
        transcriptDraft: "",
        aiNotesDraft: null,
        audioChunkUploadStatus: "idle" as const,
        segmentCount: 0,
        pendingMimeType: "audio/webm",
        updatedAt: Date.now(),
        unfinished: false,
        recordingEndedNormally: false,
        needsResume: false,
      };

      // Never merge recovery from another consultation into this session.
      if (existing.sessionId !== sessionId) {
        return null;
      }

      const next: ConsultationRecoveryRecord = {
        ...existing,
        recordingEndedNormally: existing.recordingEndedNormally ?? false,
        needsResume: existing.needsResume ?? false,
        ...patch,
        sessionId, // always force current session key
        updatedAt: Date.now(),
      };

      await saveConsultationRecovery(next);
      mirrorRecoveryIndex(sessionId, next);
      return next;
    },
    [sessionId],
  );

  // Autosave every 5 seconds only while mic is actively capturing.
  useEffect(() => {
    const shouldAutosave =
      !intentionalStopRef.current &&
      (recorderState === "recording" || recorderState === "paused");

    if (!shouldAutosave) return;

    const tick = async () => {
      const pendingBlob =
        pendingChunksRef.current.length > 0
          ? new Blob(pendingChunksRef.current, {
              type: pendingMimeRef.current,
            })
          : null;

      try {
        await persistRecovery({
          recordingStatus:
            recorderState === "recording" ? "recording" : "paused",
          recordingStartedAt: recordingStartedAtRef.current,
          elapsedSeconds: totalElapsedSeconds,
          previousDurationSeconds,
          transcriptDraft: session?.transcript || transcript?.fullText || "",
          aiNotesDraft,
          audioChunkUploadStatus: pendingBlob ? "pending" : "idle",
          segmentCount,
          pendingMimeType: pendingMimeRef.current,
          // Metadata only during autosave â€” storing 30â€“60min blobs in IndexedDB
          // freezes Stop / UI. Blobs are persisted only on real pagehide interrupt.
          pendingAudioBlob: null,
          pendingChunkBlobs: [],
          unfinished: false,
          recordingEndedNormally: false,
          needsResume: false,
        });

        await recordingService
          .autosave(sessionId, {
            elapsedSeconds: totalElapsedSeconds,
            recordingStatus:
              recorderState === "paused" ? "paused" : "recording",
            recordingStartedAt: recordingStartedAtRef.current
              ? new Date(recordingStartedAtRef.current).toISOString()
              : null,
            transcriptDraft: session?.transcript || transcript?.fullText || "",
            aiNotesDraft: aiNotesDraft || undefined,
            audioChunkUploadStatus: pendingBlob ? "pending" : "idle",
          })
          .catch(() => undefined);
      } catch {
        // Autosave must never break recording.
      }
    };

    void tick();
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [
    recorderState,
    session?.transcript,
    transcript?.fullText,
    totalElapsedSeconds,
    previousDurationSeconds,
    aiNotesDraft,
    segmentCount,
    sessionId,
    persistRecovery,
  ]);

  // pagehide â†’ unexpected interrupt recovery ONLY (not after intentional Stop).
  useEffect(() => {
    const onPageHide = () => {
      if (intentionalStopRef.current) return;
      if (recorderState !== "recording" && recorderState !== "paused") return;

      const pendingBlob =
        pendingChunksRef.current.length > 0
          ? new Blob(pendingChunksRef.current, {
              type: pendingMimeRef.current,
            })
          : null;

      void persistRecovery({
        recordingStatus: "interrupted",
        elapsedSeconds: totalElapsedSeconds,
        previousDurationSeconds,
        pendingAudioBlob: pendingBlob,
        pendingChunkBlobs: [...pendingChunksRef.current],
        unfinished: true,
        recordingEndedNormally: false,
        // Real browser/tab close or refresh â€” ONLY place that arms Resume popup.
        needsResume: true,
        audioChunkUploadStatus: pendingBlob ? "pending" : "idle",
      });

      const segmentDuration = Math.max(
        1,
        totalElapsedSeconds - previousDurationSeconds,
      );

      if (pendingBlob && pendingBlob.size > 0) {
        try {
          const token = useAuthStore.getState().token;
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/backend";
          const formData = new FormData();
          formData.append(
            "audio",
            pendingBlob,
            `segment_interrupt_${Date.now()}.webm`,
          );
          formData.append("duration", String(segmentDuration));
          formData.append("statusAfter", "interrupted");
          void fetch(
            `${apiBase}/sessions/${sessionId}/recording/segment/upload`,
            {
              method: "POST",
              body: formData,
              keepalive: true,
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            },
          );
        } catch {
          // IndexedDB recovery remains the fallback.
        }
      }

      void recordingService
        .interrupt(sessionId, { elapsedSeconds: totalElapsedSeconds })
        .catch(() => undefined);
    };

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
    };
  }, [
    recorderState,
    sessionId,
    totalElapsedSeconds,
    previousDurationSeconds,
    persistRecovery,
  ]);

  const hasAudio =
    Boolean(session?.audioUrl) || (session?.recordingSegments?.length || 0) > 0;
  const inPostStopFlow = workflow === "postStop" && (hasAudio || isUploading);
  const showPlayback =
    Boolean(session?.audioUrl) &&
    isTranscriptAvailable(session?.status) &&
    !isUploading;
  const showPipeline = inPostStopFlow && !showPlayback;
  // Backend says live recording but this tab has no active mic (refresh / mic
  // permission fail after start API). Must still show Start/Resume â€” otherwise
  // the panel is a dead 00:00 "READY" screen with no controls.
  const orphanedServerLiveStatus =
    recorderState === "idle" &&
    (session?.status === "recording" ||
      session?.status === "paused" ||
      session?.status === "resumed");
  const showStart =
    workflow === "ready" &&
    recorderState === "idle" &&
    !showRecoveryDialog &&
    !shouldClearRecoveryForStatus(session?.status) &&
    !hasAudio &&
    canStartRecording(session?.status) &&
    (!isResumableRecording(session?.status) ||
      (orphanedServerLiveStatus && previousDurationSeconds === 0));
  // Continue/resume mic after interrupt, or when server still has a live status
  // with prior audio/duration but the local mic is gone.
  const showContinue =
    workflow === "ready" &&
    recorderState === "idle" &&
    !showRecoveryDialog &&
    !shouldClearRecoveryForStatus(session?.status) &&
    isUnexpectedInterruptStatus(session?.status) &&
    (previousDurationSeconds > 0 || hasAudio || orphanedServerLiveStatus) &&
    !showStart &&
    canStartRecording(session?.status) &&
    !inPostStopFlow;
  const controlsLocked = inPostStopFlow;
  const isMicActive =
    recorderState === "recording" || recorderState === "paused";

  useEffect(() => {
    onRecordingStateChange?.({
      isRecording: isMicActive,
      elapsedSeconds: totalElapsedSeconds,
    });
  }, [isMicActive, totalElapsedSeconds, onRecordingStateChange]);

  useEffect(() => {
    setLocalRecordingState(sessionId, isMicActive, totalElapsedSeconds);
  }, [isMicActive, sessionId, setLocalRecordingState, totalElapsedSeconds]);

  const invalidateSessionData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) }),
      queryClient.invalidateQueries({
        queryKey: transcriptKeys.detail(sessionId),
      }),
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() }),
    ]);
    await refetch();
    await refetchTranscript();
  }, [queryClient, refetch, refetchTranscript, sessionId]);

  const beginMic = useCallback(async () => {
    intentionalStopRef.current = false;
    pendingChunksRef.current = [];
    await startRecorder();
    setWorkflow("recording");
  }, [startRecorder]);

  const resetForFreshStart = useCallback(async () => {
    intentionalStopRef.current = false;
    setPreviousDurationSeconds(0);
    previousDurationRef.current = 0;
    recordingStartedAtRef.current = Date.now();
    pendingChunksRef.current = [];
    setBanner(null);
    setShowRecoveryDialog(false);
    await clearAllRecovery();
  }, [clearAllRecovery]);

  const uploadBlob = useCallback(
    async (
      blob: Blob,
      duration: number,
      fileName: string,
      mimeType: string,
      options?: { finalize: boolean; statusAfter?: string },
    ) => {
      const finalize = options?.finalize !== false;
      if (finalize) {
        // Intentional Stop â€” never keep recovery / never show Resume popup.
        intentionalStopRef.current = true;
        setWorkflow("postStop");
        setShowRecoveryDialog(false);
        setBanner(null);
        await clearAllRecovery();
      }
      setIsUploading(true);

      try {
        if (!finalize) {
          await persistRecovery({
            audioChunkUploadStatus: "uploading",
            unfinished: true,
            recordingEndedNormally: false,
          });
        }

        const nextSegmentIndex =
          (session?.recordingSegments?.length || 0) +
          (session?.audioUrl && !(session.recordingSegments?.length || 0)
            ? 1
            : 0) +
          1;
        const segmentName = fileName.startsWith("segment_")
          ? fileName
          : `segment_${nextSegmentIndex}.webm`;

        await uploadAudioSegment({
          sessionId,
          blob,
          duration,
          fileName: segmentName,
          mimeType,
          finalize,
          statusAfter: options?.statusAfter || "interrupted",
        });

        pendingChunksRef.current = [];

        if (finalize) {
          await clearAllRecovery();
          setPreviousDurationSeconds(0);
          setBanner(null);
        } else {
          setPreviousDurationSeconds((prev) => prev + duration);
          await persistRecovery({
            audioChunkUploadStatus: "uploaded",
            pendingAudioBlob: null,
            pendingChunkBlobs: [],
            previousDurationSeconds: previousDurationSeconds + duration,
            elapsedSeconds: previousDurationSeconds + duration,
            unfinished: true,
            recordingEndedNormally: false,
            segmentCount: nextSegmentIndex,
          });
        }

        await invalidateSessionData();
        if (finalize) {
          toast.success("Recording saved. Transcript generation started.");
        }
      } catch (error: unknown) {
        if (!finalize) {
          await persistRecovery({
            audioChunkUploadStatus: "failed",
            unfinished: true,
            recordingEndedNormally: false,
            pendingAudioBlob: blob,
          });
        }
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to save recording",
        );
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [
      clearAllRecovery,
      invalidateSessionData,
      persistRecovery,
      previousDurationSeconds,
      session?.audioUrl,
      session?.recordingSegments,
      sessionId,
    ],
  );

  const handleStop = useCallback(async () => {
    if (isStopping || isUploading) return;

    // Immediate UI feedback â€” don't wait on IndexedDB before stopping the mic.
    setIsStopping(true);
    intentionalStopRef.current = true;
    setShowRecoveryDialog(false);
    setBanner(null);
    void clearAllRecovery();

    mrDiag(
      "DoctorRecordingPanel.handleStop",
      {
        sessionId,
        recorderState,
        sessionStatus: session?.status ?? null,
        elapsedSeconds: totalElapsedSeconds,
        workflow,
      },
      { trace: true },
    );

    try {
      if (recorderState !== "recording" && recorderState !== "paused") {
        if (
          isResumableRecording(session?.status) &&
          (session?.recordingSegments?.length || 0) > 0
        ) {
          setIsUploading(true);
          try {
            await recordingService.finalize(sessionId);
            await clearAllRecovery();
            setWorkflow("postStop");
            setBanner(null);
            await invalidateSessionData();
            toast.success("Consultation processing started.");
          } catch (error: unknown) {
            const err = error as { message?: string };
            toast.error(err?.message || "Failed to finalize consultation");
          } finally {
            setIsUploading(false);
          }
          return;
        }

        if (session?.status === "recording" && !session.audioUrl) {
          await sessionService.updateStatus(sessionId, "created");
          await clearAllRecovery();
          await invalidateSessionData();
        }
        return;
      }

      toast.message("Stopping recordingâ€¦");
      const result = await stopRecorder();
      const segmentDuration = result.duration;
      await uploadBlob(
        result.blob,
        segmentDuration,
        result.fileName,
        result.mimeType,
        { finalize: true },
      );
    } catch (error: unknown) {
      intentionalStopRef.current = false;
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to stop recording");
      throw error;
    } finally {
      setIsStopping(false);
    }
  }, [
    clearAllRecovery,
    invalidateSessionData,
    isStopping,
    isUploading,
    recorderState,
    session?.audioUrl,
    session?.recordingSegments,
    session?.status,
    sessionId,
    stopRecorder,
    totalElapsedSeconds,
    uploadBlob,
    workflow,
  ]);

  const handleStopRef = useRef(handleStop);
  handleStopRef.current = handleStop;

  useEffect(() => {
    registerStopHandler(sessionId, () => handleStopRef.current());
    return () => {
      clearSession(sessionId);
    };
  }, [clearSession, registerStopHandler, sessionId]);

  const hasOtherServerRecording = sessions.some((item) => {
    const id = getSessionId(item);
    return (
      id !== sessionId &&
      (item.status === "recording" ||
        item.status === "paused" ||
        item.status === "resumed")
    );
  });

  const handleStart = async () => {
    recordDiagEvent("DoctorRecordingPanel.handleStart", {
      file: "components/doctor/DoctorRecordingPanel.tsx",
      fn: "handleStart",
      recorderState,
      workflowState: workflow,
      sessionStatus: session?.status ?? null,
      elapsedRecordingSeconds: 0,
      details: { sessionId },
      includeStack: true,
    });

    if (hasActiveLocalRecording(sessionId) || hasOtherServerRecording) {
      toast.error(
        "Another consultation recording is already in progress. Stop it before starting a new one.",
      );
      return;
    }

    try {
      // New consultation start â€” never inherit prior duration/recovery.
      await resetForFreshStart();
      await recordingService.start(sessionId);
      await beginMic();
      await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      await refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      // If the server flipped to "recording" but the mic never started, reset
      // so the Start button remains available (previous flow).
      try {
        await sessionService.updateStatus(sessionId, "created");
      } catch {
        // ignore rollback errors
      }
      await queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(sessionId),
      });
      await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      await refetch();
      toast.error(err?.response?.data?.message || "Failed to start recording");
    }
  };

  const handleResumeConsultation = async () => {
    setRecoveryBusy(true);
    try {
      const local = await getConsultationRecovery(sessionId).catch(() => null);
      if (local && local.sessionId !== sessionId) {
        await clearAllRecovery();
        toast.error("Recovery data did not match this consultation.");
        return;
      }

      const refreshed = await refetch();
      const latest = refreshed.data || session;
      if (
        !latest ||
        !isUnexpectedInterruptStatus(latest.status)
      ) {
        await clearAllRecovery();
        setPreviousDurationSeconds(0);
        setShowRecoveryDialog(false);
        setBanner(null);
        toast.error("This consultation cannot be resumed.");
        return;
      }

      const serverSegCount = latest?.recordingSegments?.length || 0;
      const localCompletedSegCount = local?.segmentCount || 0;

      const pendingBlob =
        local?.pendingAudioBlob ||
        (local?.pendingChunkBlobs?.length
          ? new Blob(local.pendingChunkBlobs, {
              type: local.pendingMimeType || "audio/webm",
            })
          : null);

      // Upload pending only if the server does not already have that segment
      // (e.g. pagehide keepalive may have appended it already).
      if (
        pendingBlob &&
        pendingBlob.size > 0 &&
        serverSegCount <= localCompletedSegCount
      ) {
        const duration =
          Math.max(
            0,
            (local?.elapsedSeconds || 0) - (local?.previousDurationSeconds || 0),
          ) || 1;
        const nextIndex = serverSegCount + 1;
        await uploadAudioSegment({
          sessionId,
          blob: pendingBlob,
          duration,
          fileName: `segment_${nextIndex}.webm`,
          mimeType: local?.pendingMimeType || "audio/webm",
          finalize: false,
          statusAfter: "interrupted",
        });
        setPreviousDurationSeconds(
          (local?.previousDurationSeconds || 0) + duration,
        );
        await persistRecovery({
          segmentCount: nextIndex,
          previousDurationSeconds: (local?.previousDurationSeconds || 0) + duration,
          pendingAudioBlob: null,
          pendingChunkBlobs: [],
          audioChunkUploadStatus: "uploaded",
          unfinished: true,
          recordingEndedNormally: false,
        });
      } else {
        const serverPrevious =
          latest?.totalDuration || latest?.duration || 0;
        setPreviousDurationSeconds(serverPrevious);
        await persistRecovery({
          pendingAudioBlob: null,
          pendingChunkBlobs: [],
          audioChunkUploadStatus: "uploaded",
          previousDurationSeconds: serverPrevious,
          segmentCount: serverSegCount,
          unfinished: true,
          recordingEndedNormally: false,
        });
      }

      if (!recordingStartedAtRef.current) {
        recordingStartedAtRef.current = Date.now();
      }
      await recordingService.resume(sessionId);
      pendingChunksRef.current = [];
      await beginMic();
      setShowRecoveryDialog(false);
      setBanner("resumed");
      await persistRecovery({
        needsResume: false,
        unfinished: false,
        recordingEndedNormally: false,
        recordingStatus: "resumed",
      });
      await invalidateSessionData();
      toast.success("Consultation resumed successfully.");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to resume consultation");
    } finally {
      setRecoveryBusy(false);
    }
  };

  const handleDiscardConsultation = async () => {
    setRecoveryBusy(true);
    try {
      intentionalStopRef.current = true;
      await recordingService.discard(sessionId);
      await clearAllRecovery();
      setPreviousDurationSeconds(0);
      setShowRecoveryDialog(false);
      setBanner(null);
      setWorkflow("ready");
      pendingChunksRef.current = [];
      recordingStartedAtRef.current = null;
      await invalidateSessionData();
      toast.success("Unfinished consultation discarded.");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to discard consultation");
    } finally {
      setRecoveryBusy(false);
    }
  };

  const handlePauseClick = async () => {
    pauseRecorder();
    try {
      await recordingService.pause(sessionId);
    } catch {
      // local pause still applies
    }
  };

  const handleResumeMicClick = async () => {
    resumeRecorder();
    try {
      await recordingService.autosave(sessionId, {
        recordingStatus: "recording",
        elapsedSeconds: totalElapsedSeconds,
      });
    } catch {
      // ignore
    }
  };

  const handleStopClick = async () => {
    try {
      await handleStop();
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err?.message && !err.message.includes("Failed to save")) {
        toast.error(err.message || "Failed to stop recording");
      }
    }
  };

  const handleRetryTranscript = async () => {
    try {
      await generateTranscript.mutateAsync();
      await invalidateSessionData();
    } catch {
      // handled by mutation
    }
  };

  // Keep draft mirror for AI notes if present on session.
  useEffect(() => {
    if (session?.aiNotes) {
      setAiNotesDraft(session.aiNotes as unknown as Record<string, unknown>);
    }
  }, [session?.aiNotes]);

  const statusLabel = (): string => {
    if (isMicActive) return "RECORDING";
    if (session?.status === "interrupted") return "INTERRUPTED";
    if (session?.status === "paused") return "PAUSED";
    if (session?.status === "resumed") return "RESUMED";
    if (isUploading) return "UPLOADING";
    if (session?.status === "processing") return "PROCESSING";
    if (session?.status === "transcript_ready") return "TRANSCRIPT READY";
    if (
      session?.status === "ai_notes_generated" ||
      session?.status === "ready_for_review"
    ) {
      return "READY FOR REVIEW";
    }
    if (hasAudio && isTranscriptAvailable(session?.status)) return "DONE";
    return "READY";
  };

  if (isLoading && !session) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <section className="glass rounded-3xl p-5">
      <UnfinishedConsultationDialog
        open={showRecoveryDialog}
        previousDurationSeconds={previousDurationSeconds}
        onResume={handleResumeConsultation}
        onDiscard={handleDiscardConsultation}
        isBusy={recoveryBusy}
      />

      <ConsultationRecoveryBanner variant={banner} className="mb-4" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Recording
          </h3>
          <p className="truncate text-sm font-medium text-gray-800">
            {session.roundLabel ||
              (session.visitType === "inpatient" ||
              session.encounter?.encounterType === "IP"
                ? "Doctor Round"
                : "Consultation Recording")}
          </p>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide",
            isMicActive ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500",
          )}
        >
          {statusLabel()}
        </span>
      </div>

      <div className="flex flex-col items-center py-4">
        {(showStart || showContinue) && !controlsLocked && (
          <button
            type="button"
            onClick={showContinue ? handleResumeConsultation : handleStart}
            disabled={isUploading || recoveryBusy}
            className="group flex flex-col items-center gap-3"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/25 transition-transform group-hover:scale-105 group-active:scale-95">
              <Mic className="h-8 w-8 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {showContinue ? "Resume Recording" : "Start Recording"}
            </span>
          </button>
        )}

        {isMicActive && !controlsLocked && (
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full",
                recorderState === "recording"
                  ? "bg-red-600 shadow-lg shadow-red-200"
                  : "bg-amber-500",
              )}
            >
              <Mic className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <span className="font-mono text-2xl font-bold text-gray-800">
                {formatTime(totalElapsedSeconds)}
              </span>
              {previousDurationSeconds > 0 && (
                <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                  <p>
                    Previous recording{" "}
                    {formatConsultationDuration(previousDurationSeconds)}
                  </p>
                  <p>
                    New recording {formatConsultationDuration(elapsedSeconds)}
                  </p>
                  <p className="font-medium text-gray-700">
                    Total consultation duration{" "}
                    {formatConsultationDuration(totalElapsedSeconds)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {recorderState === "recording" ? (
                <button
                  type="button"
                  onClick={handlePauseClick}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResumeMicClick}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </button>
              )}
              <button
                type="button"
                onClick={handleStopClick}
                disabled={isUploading || isStopping}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isStopping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {isStopping ? "Stoppingâ€¦" : "Stop"}
              </button>
            </div>
          </div>
        )}

        {!showStart &&
          !showContinue &&
          !isMicActive &&
          recorderState === "idle" && (
            <div className="flex flex-col items-center gap-2">
              <span className="font-mono text-xl text-gray-600">
                {formatTime(
                  // Only show session duration after pipeline / playback â€” never for a fresh start.
                  shouldClearRecoveryForStatus(session.status) ||
                    isTranscriptAvailable(session.status)
                    ? session.totalDuration || session.duration || 0
                    : previousDurationSeconds,
                )}
              </span>
              <WaveformPlaceholder
                active={isUploading || session.status === "processing"}
              />
            </div>
          )}

        {recorderError && (
          <p className="mt-2 text-center text-sm text-red-600">
            {recorderError}
          </p>
        )}
      </div>

      {showPipeline && session && (
        <div className="mt-4">
          <RecordingPipelineProgress
            session={session}
            transcript={transcript}
            isUploading={isUploading}
            isRetrying={generateTranscript.isPending}
            onRetry={handleRetryTranscript}
          />
        </div>
      )}

      {showPlayback && session?.audioUrl && (
        <div className="mt-4">
          <DoctorAudioPlayer
            sessionId={sessionId}
            audioUrl={session.audioUrl}
            audioPlaybackUrl={session.audioPlaybackUrl}
            knownDuration={session.totalDuration || session.duration}
          />
          {(session.recordingSegments?.length || 0) > 1 && (
            <p className="mt-2 text-center text-xs text-gray-500">
              {session.recordingSegments!.length} audio segments Â· total{" "}
              {formatConsultationDuration(
                session.totalDuration || session.duration || 0,
              )}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function WaveformPlaceholder({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  const bars = [3, 5, 8, 12, 6, 10, 4, 7, 9, 5, 11, 6, 8, 4, 7];

  return (
    <div className={cn("flex h-8 items-end justify-center gap-0.5", className)}>
      {bars.map((height, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full bg-gray-200",
            active && "animate-pulse bg-primary/40",
          )}
          style={{ height: `${height * 2}px` }}
        />
      ))}
    </div>
  );
}
