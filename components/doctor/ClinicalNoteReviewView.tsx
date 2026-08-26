"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { useSession } from "@/hooks/sessions/useSession";
import { useTranscript } from "@/hooks/transcript/useTranscript";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import { getPatientFullName } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import { cn } from "@/lib/utils";
import { formatGeminiErrorForUser } from "@/lib/gemini-error.utils";
import {
  buildClinicalNoteLines,
  extractDiagnosisQuery,
  extractIcdCodes,
  type ClinicalNoteLine,
} from "@/utils/clinical-note.utils";

interface ClinicalNoteReviewViewProps {
  sessionId: string;
}

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

const NoteLineTag = ({ line }: { line: ClinicalNoteLine }) => {
  if (line.kind === "inferred") {
    return (
      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
        AI
      </span>
    );
  }

  if (line.kind === "lab") {
    return (
      <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
        lab
      </span>
    );
  }

  if (line.timestamp) {
    return (
      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
        {line.timestamp}
      </span>
    );
  }

  return null;
};

const SoapSection = ({
  title,
  lines,
  removedIds,
}: {
  title: string;
  lines: ClinicalNoteLine[];
  removedIds: Set<string>;
}) => {
  const visibleLines = lines.filter((line) => !removedIds.has(line.id));

  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
        {title}
      </h4>
      {visibleLines.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No content yet.</p>
      ) : (
        <ul className="space-y-3">
          {visibleLines.map((line) => (
            <li key={line.id} className="flex gap-2 text-sm leading-relaxed">
              <div className="mt-1 shrink-0">
                <NoteLineTag line={line} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-foreground",
                    line.kind === "inferred" && "text-amber-950",
                  )}
                >
                  {line.text}
                  {line.icdCode ? (
                    <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                      {line.icdCode}
                    </span>
                  ) : null}
                </p>
                {line.kind === "inferred" ? (
                  <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Inferred — confirm
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export function ClinicalNoteReviewView({ sessionId }: ClinicalNoteReviewViewProps) {
  const { data: session } = useSession(sessionId);
  const { aiNotes, generate, isGenerating } = useAiNotes(sessionId);
  const { transcript } = useTranscript(sessionId);
  const requestPrescriptionReview = useEncounterUiStore(
    (state) => state.requestPrescriptionReview,
  );
  const clearClinicalReview = useEncounterUiStore(
    (state) => state.clearClinicalReview,
  );
  const [removedInferredIds, setRemovedInferredIds] = useState<Set<string>>(
    () => new Set(),
  );

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const patientName = patient ? getPatientFullName(patient) : "Patient";
  const recordingSeconds =
    session?.totalDuration ??
    session?.duration ??
    session?.recordingSegments?.reduce(
      (sum, segment) => sum + (segment.duration || 0),
      0,
    );

  const segments = transcript?.segments ?? [];

  const subjectiveLines = useMemo(
    () => buildClinicalNoteLines(aiNotes?.subjective, "subjective", segments),
    [aiNotes?.subjective, segments],
  );
  const objectiveLines = useMemo(
    () => buildClinicalNoteLines(aiNotes?.objective, "objective", segments),
    [aiNotes?.objective, segments],
  );
  const assessmentLines = useMemo(
    () => buildClinicalNoteLines(aiNotes?.assessment, "assessment", segments),
    [aiNotes?.assessment, segments],
  );
  const planLines = useMemo(
    () => buildClinicalNoteLines(aiNotes?.plan, "plan", segments),
    [aiNotes?.plan, segments],
  );

  const allLines = useMemo(
    () => [...subjectiveLines, ...objectiveLines, ...assessmentLines, ...planLines],
    [assessmentLines, objectiveLines, planLines, subjectiveLines],
  );

  const inferredItems = useMemo(
    () => allLines.filter((line) => line.kind === "inferred"),
    [allLines],
  );

  const pendingInferred = inferredItems.filter(
    (item) => !removedInferredIds.has(item.id),
  );

  const suggestedCodes = extractIcdCodes(
    [aiNotes?.assessment, aiNotes?.plan, aiNotes?.summary]
      .filter(Boolean)
      .join(" "),
  );

  const diagnosisQuery = extractDiagnosisQuery(
    aiNotes?.assessment,
    aiNotes?.plan,
  );

  const notesLoading =
    isGenerating ||
    aiNotes?.status === "processing" ||
    aiNotes?.status === "pending";

  const handleKeepInferred = (id: string) => {
    setRemovedInferredIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const handleRemoveInferred = (id: string) => {
    setRemovedInferredIds((current) => new Set(current).add(id));
  };

  const handleApproveAndPrescribe = () => {
    requestPrescriptionReview({ suggestQuery: diagnosisQuery });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={clearClinicalReview}
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground hover:bg-muted/50"
          aria-label="Back to consultation"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Clinical note
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {patientName} · drafted from {formatDuration(recordingSeconds)} of audio
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Draft note
              </h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                Unsigned
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Blue tag = spoken · amber = model inferred
            </span>
          </div>

          {aiNotes?.status === "failed" ? (
            <div className="mx-5 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
              <p className="text-sm font-medium text-amber-900">
                Clinical note generation failed
              </p>
              <p className="mt-1 text-xs text-amber-800">
                {formatGeminiErrorForUser(aiNotes.error, aiNotes.aiError) ||
                  "AI note generation failed. You can retry or edit manually."}
              </p>
              <button
                type="button"
                onClick={() => generate(true)}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-950"
              >
                Retry note generation
              </button>
            </div>
          ) : null}

          {notesLoading ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Drafting clinical note from transcript…
            </div>
          ) : (
            <div className="space-y-6 p-5">
              <SoapSection
                title="Subjective"
                lines={subjectiveLines}
                removedIds={removedInferredIds}
              />
              <SoapSection
                title="Objective"
                lines={objectiveLines}
                removedIds={removedInferredIds}
              />
              <SoapSection
                title="Assessment"
                lines={assessmentLines}
                removedIds={removedInferredIds}
              />
              <SoapSection
                title="Plan"
                lines={planLines}
                removedIds={removedInferredIds}
              />
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Coding suggested
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Goes to billing</p>
            <div className="mt-3 space-y-2">
              {suggestedCodes.length > 0 ? (
                suggestedCodes.map((code) => (
                  <div
                    key={code}
                    className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2"
                  >
                    <span className="font-mono text-xs font-semibold text-primary">
                      {code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      From assessment / plan
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Codes will appear once assessment is generated.
                </p>
              )}
            </div>
          </section>

          {pendingInferred.length > 0 ? (
            <section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-amber-900">
                  Before you sign
                </p>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                  {pendingInferred.length} to confirm
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {pendingInferred.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-amber-200/80 bg-white/80 p-3"
                  >
                    <p className="text-sm font-medium text-amber-950">
                      {item.text.length > 72
                        ? `${item.text.slice(0, 72)}…`
                        : item.text}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-800">
                      Model inferred this from the conversation or template.
                      Confirm before signing.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleKeepInferred(item.id)}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-50"
                      >
                        Keep
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveInferred(item.id)}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Signing writes this note to the record. You can amend it for 24
              hours.
            </p>
            <button
              type="button"
              disabled={notesLoading || aiNotes?.status === "failed"}
              onClick={handleApproveAndPrescribe}
              className={cn(
                "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full",
                "bg-rose-700 px-4 py-3 text-sm font-semibold text-white",
                "hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              Approve and prescribe
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
