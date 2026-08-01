"use client";

import { useState } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useTranscript } from "@/hooks/transcript/useTranscript";
import { useTranscriptMutations } from "@/hooks/transcript/useTranscriptMutations";
import { TranscriptSegment } from "@/types/transcript.types";
import { cn } from "@/lib/utils";

interface DoctorLiveTranscriptProps {
  sessionId: string;
}

const getSpeakerLabel = (speaker?: string, doctorName = "DR. CHEN") => {
  if (speaker === "doctor") return doctorName;
  if (speaker === "patient") return "PATIENT";
  return speaker?.toUpperCase() || "SPEAKER";
};

export function DoctorLiveTranscript({ sessionId }: DoctorLiveTranscriptProps) {
  const { session, transcript, isLoading, isProcessing } =
    useTranscript(sessionId);
  const { updateTranscript, reassignSpeakers } =
    useTranscriptMutations(sessionId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const doctor =
    session && typeof session.userId === "object"
      ? session.userId
      : null;
  const doctorLabel = doctor
    ? `DR. ${(doctor.lastName || doctor.firstName || "CHEN").toUpperCase()}`
    : "DR. CHEN";

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
      <section className="flex flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </section>
    );
  }

  return (
    <section className="flex min-h-[320px] flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-3">
        <h3 className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          Live Transcript
        </h3>
        <div className="flex items-center gap-2">
          {segments.length > 0 && (
            <button
              type="button"
              onClick={() => reassignSpeakers.mutate("flip")}
              disabled={reassignSpeakers.isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              title="Swap Doctor and Patient labels"
            >
              {reassignSpeakers.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-3 w-3" />
              )}
              Swap speakers
            </button>
          )}
          <span className="text-[10px] text-gray-400">Inline editing enabled</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isProcessing && segments.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            Generating transcript...
          </div>
        )}

        {!isProcessing && segments.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            Transcript will appear here once recording starts.
          </p>
        )}

        {segments.map((segment) => {
          const isDoctor = segment.speaker === "doctor";
          const isEditing = editingId === segment.id;

          return (
            <div
              key={segment.id}
              className={cn("flex flex-col gap-1", isDoctor ? "items-start" : "items-end")}
            >
              <span className="text-[10px] font-semibold tracking-wide text-gray-400">
                {getSpeakerLabel(segment.speaker, doctorLabel)}
              </span>

              {isEditing ? (
                <div className="w-full max-w-[90%] space-y-2">
                  <textarea
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleEditSave}
                      disabled={updateTranscript.isPending}
                      className="rounded-lg bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditValue("");
                      }}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleEditStart(segment)}
                  className={cn(
                    "max-w-[90%] rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed",
                    isDoctor
                      ? "rounded-tl-sm bg-gray-100 text-gray-800"
                      : "rounded-tr-sm bg-blue-50 text-gray-800",
                  )}
                >
                  {segment.text}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
