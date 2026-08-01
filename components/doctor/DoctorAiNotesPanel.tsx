"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  History,
  Loader2,
  Pencil,
  Pill,
  RefreshCw,
  Stethoscope,
} from "lucide-react";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { useSession } from "@/hooks/sessions/useSession";
import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { PreviousHistoryItem } from "@/types/session.types";
import type { AdmissionTimelineItem } from "@/types/encounter.types";
import { getEncounterType } from "@/utils/encounter.utils";
import { cn } from "@/lib/utils";

interface DoctorAiNotesPanelProps {
  sessionId: string;
}

interface NoteSection {
  key: string;
  label: string;
  icon: typeof FileText;
  content?: string;
  defaultOpen?: boolean;
}

const renderContent = (content?: string) => {
  if (!content?.trim()) {
    return <p className="text-sm text-gray-400 italic">No content yet.</p>;
  }

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.every((line) => line.startsWith("-") || line.startsWith("•"))) {
    return (
      <ul className="space-y-1 text-sm text-gray-700">
        {lines.map((line, i) => (
          <li key={i}>{line.replace(/^[-•]+\s*/, "• ")}</li>
        ))}
      </ul>
    );
  }

  return <p className="text-sm whitespace-pre-wrap text-gray-700">{content}</p>;
};

const formatMedications = (medications?: AiNotesMedication[]) => {
  if (!medications?.length) {
    return (
      <p className="text-sm text-gray-400 italic">No prescriptions yet.</p>
    );
  }

  return (
    <ol className="space-y-2 text-sm text-gray-700">
      {medications.map((med, i) => (
        <li key={`${med.medicine}-${i}`}>
          <span className="font-medium">
            {i + 1}. {med.medicine}
          </span>
          {(med.morning || med.afternoon || med.night) && (
            <span className="text-gray-500">
              {" "}
              — {med.morning || "0"}-{med.afternoon || "0"}-{med.night || "0"}
            </span>
          )}
          {med.days && (
            <span className="text-gray-500"> for {med.days} days</span>
          )}
          {med.instructions && (
            <p className="text-xs text-gray-500">{med.instructions}</p>
          )}
        </li>
      ))}
    </ol>
  );
};

const formatConsultationDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getMedicationNames = (medications?: AiNotesMedication[]) =>
  (medications || [])
    .map((med) => med.medicine?.trim())
    .filter(Boolean)
    .join(", ");

const formatPreviousHistory = (
  items: PreviousHistoryItem[] | undefined,
  onSelect?: (sessionId: string) => void,
) => {
  if (!items?.length) {
    return (
      <p className="text-sm text-gray-400 italic">
        No previous consultation history found.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const medicationNames = getMedicationNames(item.aiNotes?.medications);
        const assessment = item.aiNotes?.assessment?.trim();
        const summary = item.aiNotes?.summary?.trim();

        return (
          <article
            key={item.sessionId}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onClick={() => onSelect?.(item.sessionId)}
            onKeyDown={(event) => {
              if (onSelect && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onSelect(item.sessionId);
              }
            }}
            className={cn(
              "rounded-lg border border-gray-200 bg-white px-3 py-2.5",
              onSelect && "cursor-pointer hover:border-teal-200 hover:bg-teal-50/40",
            )}
          >
            <p className="text-[11px] font-semibold tracking-wide text-teal-700 uppercase">
              {formatConsultationDate(item.completedAt)}
            </p>
            {item.title ? (
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {item.title}
              </p>
            ) : null}
            <dl className="mt-2 space-y-1.5 text-sm">
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase">
                  Assessment (Diagnosis)
                </dt>
                <dd className="whitespace-pre-wrap text-gray-700">
                  {assessment || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase">
                  Summary
                </dt>
                <dd className="whitespace-pre-wrap text-gray-700">
                  {summary || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase">
                  Medications
                </dt>
                <dd className="text-gray-700">{medicationNames || "—"}</dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
};

const formatAdmissionTimeline = (
  items: AdmissionTimelineItem[] | undefined,
  onSelect?: (sessionId: string) => void,
) => {
  if (!items?.length) {
    return (
      <p className="text-sm text-gray-400 italic">
        No admission timeline yet.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-sky-700 uppercase">
        Admission Timeline
      </p>
      {items.map((item) => (
        <button
          key={item.sessionId}
          type="button"
          onClick={() => onSelect?.(item.sessionId)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
            item.isCurrent
              ? "border-sky-200 bg-sky-50 text-sky-800"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
          )}
        >
          <span className="font-medium">{item.label}</span>
          <span className="text-[11px] text-gray-400 capitalize">
            {item.status.replace(/_/g, " ")}
          </span>
        </button>
      ))}
    </div>
  );
};

export function DoctorAiNotesPanel({ sessionId }: DoctorAiNotesPanelProps) {
  const router = useRouter();
  const { data: session } = useSession(sessionId);
  const {
    aiNotes,
    isLoading,
    isGenerating,
    isCompleted,
    isFailed,
    transcriptReady,
    generate,
  } = useAiNotes(sessionId);
  const isIp = getEncounterType(session) === "IP";

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    previous_history: true,
    prescription: true,
  });

  const openConsultation = (targetSessionId: string) => {
    if (!targetSessionId || targetSessionId === sessionId) return;
    router.push(`/doctor/workspace/${targetSessionId}`);
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sections: NoteSection[] = [
    {
      key: "chief_complaint",
      label: "Chief Complaint",
      icon: ClipboardList,
      content: aiNotes?.subjective?.split("\n")[0],
    },
    {
      key: "hpi",
      label: "History of Present Illness",
      icon: FileText,
      content: aiNotes?.subjective,
    },
    {
      key: "previous_history",
      label: isIp
        ? "Previous History / Admission Timeline"
        : "Previous History (Last 3 Visits)",
      icon: History,
      defaultOpen: true,
    },
    {
      key: "examination",
      label: "Examination",
      icon: Stethoscope,
      content: aiNotes?.objective,
    },
    {
      key: "assessment",
      label: "Assessment",
      icon: FileText,
      content: aiNotes?.assessment,
    },
    {
      key: "diagnosis",
      label: "Diagnosis",
      icon: FileText,
      content: aiNotes?.assessment,
    },
    {
      key: "treatment",
      label: "Treatment Plan",
      icon: FileText,
      content: aiNotes?.plan,
    },
    {
      key: "prescription",
      label: "Prescription",
      icon: Pill,
      defaultOpen: true,
    },
    {
      key: "followup",
      label: "Follow-up",
      icon: FileText,
      content: aiNotes?.remarks || aiNotes?.plan,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h3 className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          AI Medical Notes
        </h3>
        <button
          type="button"
          onClick={() => generate(true)}
          disabled={!transcriptReady || isGenerating}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Regenerate
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {!transcriptReady && (
          <p className="px-2 py-4 text-sm text-gray-400">
            Complete recording to generate AI notes.
          </p>
        )}

        {transcriptReady && isFailed && (
          <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <p className="font-medium">AI notes generation failed</p>
            <p className="mt-0.5 text-xs text-amber-700">
              {aiNotes?.error ||
                "Gemini API quota/error. Click Regenerate, or use Edit Notes to fill manually."}
            </p>
            <button
              type="button"
              onClick={() => generate(true)}
              disabled={isGenerating}
              className="mt-2 rounded-lg bg-amber-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
            >
              Retry generate
            </button>
          </div>
        )}

        {transcriptReady && isGenerating && !isCompleted && (
          <div className="flex items-center gap-2 px-2 py-4 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            Generating notes...
          </div>
        )}

        {sections.map((section) => {
          const isOpen =
            openSections[section.key] ?? section.defaultOpen ?? false;
          const Icon = section.icon;

          return (
            <div
              key={section.key}
              className="rounded-xl border border-gray-100 bg-gray-50/50"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
              >
                <Icon className="h-3.5 w-3.5 text-gray-400" />
                <span className="flex-1 text-sm font-medium text-gray-700">
                  {section.label}
                </span>
                <Pencil className="h-3 w-3 text-gray-300" />
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-3 py-3">
                  {section.key === "prescription"
                    ? formatMedications(aiNotes?.medications)
                    : section.key === "previous_history"
                      ? isIp
                        ? (
                            <div className="space-y-4">
                              {formatAdmissionTimeline(
                                session?.admissionTimeline,
                                openConsultation,
                              )}
                              {formatPreviousHistory(
                                session?.previousHistory,
                                openConsultation,
                              )}
                            </div>
                          )
                        : formatPreviousHistory(
                            session?.previousHistory,
                            openConsultation,
                          )
                      : renderContent(section.content)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
