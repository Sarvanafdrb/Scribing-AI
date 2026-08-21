"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useTranscript } from "@/hooks/transcript/useTranscript";
import { useTranscriptMutations } from "@/hooks/transcript/useTranscriptMutations";
import { useActiveRecordingStore } from "@/store/active-recording.store";
import { useLiveTranscriptStore, type LiveTranscriptSegment } from "@/store/live-transcript.store";
import { TranscriptSegment } from "@/types/transcript.types";
import { cn } from "@/lib/utils";

interface DoctorLiveTranscriptProps {
  sessionId: string;
}

const EMPTY_LIVE_SEGMENTS: LiveTranscriptSegment[] = [];

const getSpeakerLabel = (speaker?: string, doctorName = "Doctor") => {
  if (speaker === "doctor") return doctorName;
  if (speaker === "patient") return "Patient";
  return speaker || "Speaker";
};

const formatSegmentTime = (startTime?: number) => {
  if (startTime === undefined || startTime === null) return "";
  const total = Math.max(0, Math.floor(startTime));
  const mins = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const secs = (total % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export function DoctorLiveTranscript({ sessionId }: DoctorLiveTranscriptProps) {
  const { session, transcript, isLoading, isProcessing } =
    useTranscript(sessionId);
  const { updateTranscript, reassignSpeakers } =
    useTranscriptMutations(sessionId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLocallyRecording = useActiveRecordingStore(
    (state) =>
      state.isLocallyRecording && state.sessionId === sessionId,
  );
  const liveSegments = useLiveTranscriptStore((state) =>
    state.sessionId === sessionId ? state.segments : EMPTY_LIVE_SEGMENTS,
  );
  const flipLiveSpeakers = useLiveTranscriptStore(
    (state) => state.flipAllSpeakers,
  );

  const doctor =
    session && typeof session.userId === "object" ? session.userId : null;
  const doctorLabel = doctor
    ? `Dr. ${doctor.lastName || doctor.firstName || "Doctor"}`
    : "Doctor";

  const serverSegments = transcript?.segments || [];

  useEffect(() => {
    if (serverSegments.length > 0) {
      useLiveTranscriptStore.getState().clear();
    }
  }, [serverSegments.length]);

  const segments = useMemo(() => {
    if (serverSegments.length > 0) {
      return serverSegments;
    }
    return liveSegments.map(
      (segment): TranscriptSegment => ({
        id: segment.id,
        start: segment.start,
        end: segment.start,
        text: segment.text,
        translation: segment.translation,
        speaker: segment.speaker,
        language: segment.translation ? "mixed" : "ta",
        confidence: 0.5,
      }),
    );
  }, [liveSegments, serverSegments]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [segments.length, isLocallyRecording]);

  const handleEditStart = (segment: TranscriptSegment) => {
    if (segment.id.startsWith("live-")) return;
    setEditingId(segment.id);
    setEditValue(segment.text);
  };

  const handleEditSave = async () => {
    if (!editingId || !transcript) return;

    const updatedSegments = transcript.segments.map((seg) =>
      seg.id === editingId ? { ...seg, text: editValue } : seg,
    );

    await updateTranscript.mutateAsync({
      segments: updatedSegments,
      fullText: updatedSegments.map((s) => s.text).join(" "),
    });

    setEditingId(null);
    setEditValue("");
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[420px] flex-1 items-center justify-center rounded-3xl border border-border/60 bg-card">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </section>
    );
  }

  return (
    <section className="flex min-h-[420px] flex-1 flex-col rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-serif text-base font-semibold text-foreground">
            Live transcript
          </h3>
          {isLocallyRecording ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
              Recording
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {(serverSegments.length > 0 || liveSegments.length > 0) && (
            <button
              type="button"
              onClick={() => {
                if (serverSegments.length > 0) {
                  reassignSpeakers.mutate("flip");
                  return;
                }
                flipLiveSpeakers();
              }}
              disabled={reassignSpeakers.isPending}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
              title="Swap Doctor and Patient labels"
            >
              {reassignSpeakers.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-3 w-3" />
              )}
              Swap
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {segments.length} line{segments.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
        {isProcessing && segments.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Generating transcript…
          </div>
        )}

        {!isProcessing && segments.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isLocallyRecording
              ? "Listening… speech will appear here as you talk."
              : "Nothing yet. Tap record to begin."}
          </p>
        )}

        {segments.map((segment) => {
          const isDoctor = segment.speaker === "doctor";
          const isEditing = editingId === segment.id;
          const isLive = segment.id.startsWith("live-");

          return (
            <div key={segment.id} className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">
                  {formatSegmentTime(segment.start)}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    isDoctor ? "text-primary" : "text-emerald-700",
                  )}
                >
                  {getSpeakerLabel(segment.speaker, doctorLabel)}
                </span>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleEditSave()}
                      disabled={updateTranscript.isPending}
                      className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditValue("");
                      }}
                      className="rounded-lg border border-border px-3 py-1 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  role={!isLive ? "button" : undefined}
                  tabIndex={!isLive ? 0 : undefined}
                  onClick={() => {
                    if (!isLive) handleEditStart(segment);
                  }}
                  onKeyDown={(event) => {
                    if (isLive) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleEditStart(segment);
                    }
                  }}
                  className="px-0 py-0.5 text-left"
                >
                  <span className="block text-sm leading-relaxed text-foreground">
                    {segment.text}
                  </span>
                  {segment.translation ? (
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground italic">
                      {segment.translation}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
