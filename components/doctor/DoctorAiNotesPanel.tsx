"use client";

import { useState } from "react";
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
import type { Patient } from "@/types/patient.types";

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
    return (
      <p className="text-sm text-gray-400 italic">No content yet.</p>
    );
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
    return <p className="text-sm text-gray-400 italic">No prescriptions yet.</p>;
  }

  return (
    <ol className="space-y-2 text-sm text-gray-700">
      {medications.map((med, i) => (
        <li key={`${med.medicine}-${i}`}>
          <span className="font-medium">{i + 1}. {med.medicine}</span>
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

const formatPreviousHistory = (items?: string[]) => {
  const history = items?.map((item) => item.trim()).filter(Boolean) || [];

  if (history.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        No previous history recorded.
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-sm text-gray-700">
      {history.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
          {item}
        </li>
      ))}
    </ul>
  );
};

export function DoctorAiNotesPanel({ sessionId }: DoctorAiNotesPanelProps) {
  const { data: session } = useSession(sessionId);
  const {
    aiNotes,
    isLoading,
    isGenerating,
    isCompleted,
    transcriptReady,
    generate,
  } = useAiNotes(sessionId);

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    previous_history: true,
    prescription: true,
  });

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
      label: "Previous History",
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
                      ? formatPreviousHistory(patient?.medications)
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
