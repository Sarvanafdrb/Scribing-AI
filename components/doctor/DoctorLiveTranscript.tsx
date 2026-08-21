"use client";

import { useState } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useTranscript } from "@/hooks/transcript/useTranscript";
import { useTranscriptMutations } from "@/hooks/transcript/useTranscriptMutations";
import { useActiveRecordingStore } from "@/store/active-recording.store";
import { TranscriptSegment } from "@/types/transcript.types";
import { cn } from "@/lib/utils";

interface DoctorLiveTranscriptProps {
  sessionId: string;
}

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
  const isLocallyRecording = useActiveRecordingStore(
    (state) =>
      state.isLocallyRecording && state.sessionId === sessionId,
  );

  const doctor =
    session && typeof session.userId === "object" ? session.userId : null;
  const doctorLabel = doctor
    ? `Dr. ${doctor.lastName || doctor.firstName || "Doctor"}`
    : "Doctor";

  const segments = transcript?.segments || [];

  const handleEditStart = (segment: TranscriptSegment) => {
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
      <section className="flex min-h-[360px] flex-1 items-center justify-center glass rounded-3xl p-5">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </section>
    );
  }

  return (
    <section className="flex min-h-[360px] flex-1 flex-col glass rounded-3xl">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Live transcript</h3>
          {isLocallyRecording ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
              Recording
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {segments.length > 0 && (
            <button
              type="button"
              onClick={() => reassignSpeakers.mutate("flip")}
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

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {isProcessing && segments.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Generating transcriptâ€¦
          </div>
        )}

        {!isProcessing && segments.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isLocallyRecording
              ? "Listeningâ€¦ transcript will appear after processing."
              : "Nothing yet. Tap record to begin."}
          </p>
        )}

        {segments.map((segment) => {
          const isDoctor = segment.speaker === "doctor";
          const isEditing = editingId === segment.id;

          return (
            <div key={segment.id} className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatSegmentTime(segment.start)}</span>
                <span
                  className={cn(
                    "font-semibold",
                    isDoctor ? "text-blue-700 dark:text-blue-300" : "text-emerald-700 dark:text-emerald-300",
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
                <button
                  type="button"
                  onClick={() => handleEditStart(segment)}
                  className="block w-full rounded-xl border border-transparent px-1 py-1 text-left text-sm leading-relaxed text-foreground hover:border-border/60 hover:bg-muted/30"
                >
                  {segment.text}
                  {segment.translation ? (
                    <span className="mt-1 block text-xs text-muted-foreground italic">
                      {segment.translation}
                    </span>
                  ) : null}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
