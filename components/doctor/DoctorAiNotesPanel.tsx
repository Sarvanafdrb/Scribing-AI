"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import { sessionService } from "@/services/session.service";
import type { AiNotesMedication } from "@/types/ai-notes.types";
import { PrescriptionMedicationHistoryTable } from "@/components/shared/prescription/PrescriptionMedicationHistoryTable";
import {
  formatSavedMedicationPrice,
  getMedicationDisplayName,
  getMedicationDoseLabel,
} from "@/utils/prescriptionPrice.utils";
import type { PreviousHistoryItem } from "@/types/session.types";
import type { AdmissionTimelineItem } from "@/types/encounter.types";
import type { Patient } from "@/types/patient.types";
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
            {i + 1}. {getMedicationDisplayName(med)}
          </span>
          {getMedicationDoseLabel(med) ? (
            <span className="text-gray-500"> — {getMedicationDoseLabel(med)}</span>
          ) : null}
          {med.days ? (
            <span className="text-gray-500"> for {med.days} days</span>
          ) : null}
          {med.instructions ? (
            <p className="text-xs text-gray-500">{med.instructions}</p>
          ) : null}
          <p className="text-xs font-medium text-teal-700">
            {formatSavedMedicationPrice(med)}
          </p>
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
        const medications = item.aiNotes?.medications;
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
              onSelect &&
                "cursor-pointer hover:border-primary/30 hover:bg-primary/10",
            )}
          >
            <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
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
                <dd className="text-gray-700">
                  <PrescriptionMedicationHistoryTable medications={medications} />
                </dd>
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

  // Group by admission day: Day 1 → Morning/Afternoon/Night, Day 2 → …
  const byDay = new Map<number, AdmissionTimelineItem[]>();
  for (const item of items) {
    const day = item.admissionDay || 1;
    const list = byDay.get(day) || [];
    list.push(item);
    byDay.set(day, list);
  }

  const days = [...byDay.keys()].sort((a, b) => a - b);

  const doctorName = (item: AdmissionTimelineItem) => {
    const doctor = item.doctor;
    if (!doctor) return "—";
    const name = `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim();
    return name ? `Dr. ${name}` : "—";
  };

  const completedTime = (item: AdmissionTimelineItem) => {
    if (!item.completedAt) return "—";
    const date = new Date(item.completedAt);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const statusText = (item: AdmissionTimelineItem) => {
    const status = item.consultationStatus || item.status || "";
    return status.replace(/_/g, " ");
  };

  return (
    <div className="space-y-3">
      <p className="mb-1 text-[11px] font-semibold tracking-wide text-sky-700 uppercase">
        Admission Timeline
      </p>
      {days.map((day) => {
        const dayItems = (byDay.get(day) || []).sort(
          (a, b) => (a.roundNumber || 0) - (b.roundNumber || 0),
        );
        return (
          <div key={day} className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-600">Day {day}</p>
            {dayItems.map((item) => {
              const canOpen = Boolean(item.sessionId);
              const content = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium capitalize">
                      {item.roundType || item.roundLabel || item.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-gray-400">
                      {completedTime(item)} · {doctorName(item)} ·{" "}
                      <span className="capitalize">{statusText(item)}</span>
                    </span>
                  </span>
                </>
              );

              if (!canOpen) {
                return (
                  <div
                    key={item.roundScheduleId || item.label}
                    className="flex w-full items-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-gray-500"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <button
                  key={item.sessionId || item.roundScheduleId || item.label}
                  type="button"
                  onClick={() => onSelect?.(item.sessionId!)}
                  className={cn(
                    "flex w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    item.isCurrent
                      ? "border-sky-200 bg-sky-50 text-sky-800"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {content}
                </button>
              );
            })}
          </div>
        );
      })}
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

  const patientId =
    session && typeof session.patientId === "object"
      ? String(
          (session.patientId as Patient).id ||
            (session.patientId as Patient)._id ||
            "",
        )
      : String(session?.patientId || "");

  // Lightweight count only — widget body still uses session.previousHistory (latest 3).
  const historyCountQuery = useQuery({
    queryKey: ["patient-previous-history-count", patientId, sessionId],
    queryFn: async () => {
      const result = await sessionService.getAll({
        patientId,
        status: "completed",
        page: 1,
        limit: 1,
      });
      const totalCompleted = result.total || 0;
      // Match findPreviousHistoryForPatient: exclude the current session.
      const excludeCurrent = session?.status === "completed" ? 1 : 0;
      return Math.max(0, totalCompleted - excludeCurrent);
    },
    enabled: Boolean(patientId),
    staleTime: 60 * 1000,
  });

  const previousHistoryTotal =
    historyCountQuery.data ?? session?.previousHistory?.length ?? 0;
  const showViewAllHistory = Boolean(patientId) && previousHistoryTotal > 3;
  const historyPageHref = patientId
    ? `/doctor/patients/${patientId}/history`
    : "";

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

  const previousHistoryLabel = isIp
    ? `Previous History / Admission Timeline (${previousHistoryTotal} Visits)`
    : `Previous History (${previousHistoryTotal} Visits)`;

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
      label: previousHistoryLabel,
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
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="glass-tint flex h-full flex-col rounded-3xl">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
        <h3 className="text-[10px] font-semibold tracking-wider text-primary uppercase">
          ✦ Drafted Note
        </h3>
        <button
          type="button"
          onClick={() => generate(true)}
          disabled={!transcriptReady || isGenerating}
          className="glass-pill flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
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
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
              className="glass glass-row rounded-2xl"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
                  {section.label}
                </span>
                <Pencil className="h-3 w-3 shrink-0 text-gray-300" />
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-3 py-3">
                  {section.key === "prescription" ? (
                    formatMedications(aiNotes?.medications)
                  ) : section.key === "previous_history" ? (
                    <div className="space-y-3">
                      {isIp ? (
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
                      ) : (
                        formatPreviousHistory(
                          session?.previousHistory,
                          openConsultation,
                        )
                      )}
                      {showViewAllHistory ? (
                        <div className="pt-1 text-center">
                          <a
                            href={historyPageHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex text-xs font-medium text-primary hover:text-primary hover:underline"
                          >
                            View All →
                          </a>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    renderContent(section.content)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
