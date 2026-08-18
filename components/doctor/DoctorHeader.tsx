"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Eye,
  FileDown,
  Loader2,
  Printer,
  Save,
  Stethoscope,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { useSession } from "@/hooks/sessions/useSession";
import { UserProfileDropdown } from "@/components/shared/UserProfileDropdown";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { EncounterStatusBadge } from "@/components/doctor/EncounterStatusBadge";
import { AiNotesPreviewModal } from "@/components/ai-notes/AiNotesPreviewModal";
import { RoundsDrawer } from "@/components/doctor/RoundsDrawer";
import { SaveConsultationDialog } from "@/components/doctor/SaveConsultationDialog";
import { IncompletePrescriptionCompletionDialog } from "@/components/doctor/IncompletePrescriptionCompletionDialog";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import { sessionService } from "@/services/session.service";
import { recordingService } from "@/services/recording.service";
import { sessionKeys } from "@/services/session.queries";
import { aiNotesKeys } from "@/services/ai-notes.queries";
import {
  buildAiNotesExportContent,
  downloadAiNotesPdf,
  hasExportableAiNotes,
  resolveCompletionExportContent,
} from "@/utils/ai-notes-export.utils";
import {
  isConsultationCompleted,
  isReviewReady,
  isResumableRecording,
  isTranscriptAvailable,
} from "@/utils/session-status.utils";
import { getPatientAge, getPatientFullName } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import type { AiNotes } from "@/types/ai-notes.types";
import type { AiNotesExportContent } from "@/utils/ai-notes-export.utils";
import { getSessionDepartmentName } from "@/types/session.types";
import { cn } from "@/lib/utils";
import {
  findPrescriptionCompletionIssues,
  type PrescriptionCompletionIssue,
} from "@/utils/prescriptionMedication.utils";

const EMPTY_AI_NOTES: AiNotes = {
  status: "completed",
  summary: "",
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  remarks: "",
  medications: [],
};

const formatGender = (gender?: string) => {
  if (!gender) return "—";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

interface DoctorHeaderProps {
  sessionId: string;
  elapsedSeconds?: number;
  isRecording?: boolean;
}

export function DoctorHeader({
  sessionId,
  elapsedSeconds = 0,
  isRecording = false,
}: DoctorHeaderProps) {
  const queryClient = useQueryClient();
  const { data: session, refetch } = useSession(sessionId);
  const { aiNotes, saveExportContent } = useAiNotes(sessionId);
  const [saved, setSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewAutoAction, setPreviewAutoAction] = useState<
    "print" | "pdf" | undefined
  >(undefined);
  const [previewAutoVoiceEdit, setPreviewAutoVoiceEdit] = useState(false);
  const [previewAutoManualEdit, setPreviewAutoManualEdit] = useState(false);
  const roundsOpen = useEncounterUiStore((s) => s.roundsDrawerOpen);
  const setRoundsOpen = useEncounterUiStore((s) => s.setRoundsDrawerOpen);
  const saveDialogOpen = useEncounterUiStore((s) => s.saveDialogOpen);
  const setSaveDialogOpen = useEncounterUiStore((s) => s.setSaveDialogOpen);
  const [incompletePrescriptionOpen, setIncompletePrescriptionOpen] =
    useState(false);
  const [prescriptionCompletionIssues, setPrescriptionCompletionIssues] =
    useState<PrescriptionCompletionIssue[]>([]);
  const [previewEditingContent, setPreviewEditingContent] =
    useState<AiNotesExportContent | null>(null);

  const handlePreviewEditingContentChange = useCallback(
    (content: AiNotesExportContent | null) => {
      setPreviewEditingContent(content);
    },
    [],
  );

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const patientAge = getPatientAge(patient);
  const hasRecording =
    (session?.recordingSegments?.length || 0) > 0 || Boolean(session?.audioUrl);
  const transcriptReady = isTranscriptAvailable(session?.status);
  const notesFailed = aiNotes?.status === "failed";
  const canExport = Boolean(session && hasExportableAiNotes(aiNotes));
  const canOpenNotes = Boolean(session) && (canExport || transcriptReady);
  const isCompleted = isConsultationCompleted(session?.status);
  const canSave =
    Boolean(session) &&
    !isCompleted &&
    (canExport ||
      isReviewReady(session?.status) ||
      transcriptReady ||
      (isResumableRecording(session?.status) && hasRecording));
  const exportContent =
    session && canOpenNotes
      ? buildAiNotesExportContent(
          canExport && aiNotes
            ? aiNotes
            : { ...EMPTY_AI_NOTES, ...aiNotes, status: "completed" },
          session,
        )
      : null;

  useEffect(() => {
    if (isRecording) {
      setSaved(false);
      return;
    }
    if (session?.status === "completed") {
      setSaved(true);
    }
  }, [isRecording, session?.status]);

  useEffect(() => {
    if (
      session?.status === "ready_for_review" ||
      session?.status === "ai_notes_generated" ||
      session?.status === "transcript_ready"
    ) {
      setSaved(false);
    }
  }, [session?.status]);

  const openPreview = (
    action?: "print" | "pdf",
    options?: { voiceEdit?: boolean; manualEdit?: boolean },
  ) => {
    if (!exportContent || !session) {
      toast.error(
        notesFailed
          ? "AI notes failed to generate. Use Regenerate, or Edit Notes to fill manually."
          : "Complete recording / wait for transcript first.",
      );
      return;
    }
    if (!canExport && notesFailed) {
      toast.message("AI notes failed — opening blank notes for manual edit.");
    } else if (!canExport && transcriptReady) {
      toast.message("AI notes still generating — you can edit manually now.");
    }
    setPreviewAutoAction(action);
    setPreviewAutoVoiceEdit(Boolean(options?.voiceEdit));
    setPreviewAutoManualEdit(Boolean(options?.manualEdit));
    setIsPreviewOpen(true);
  };

  const getCompletionExportContent = (): AiNotesExportContent | null =>
    resolveCompletionExportContent(exportContent, previewEditingContent);

  const getCompletionMedications = () =>
    getCompletionExportContent()?.medications ?? aiNotes?.medications ?? [];

  const completeConsultation = async (allowIncompletePrescription = false) => {
    if (!sessionId || !session) return;

    setIsSaving(true);
    try {
      const contentToSave = getCompletionExportContent();
      const medications = getCompletionMedications();
      const issues = findPrescriptionCompletionIssues(medications);
      const hasIncompletePrescription = issues.length > 0;

      if (contentToSave && canExport) {
        await saveExportContent(contentToSave, {
          omitMedications:
            allowIncompletePrescription && hasIncompletePrescription,
        });
      }

      await sessionService.updateStatus(sessionId, "completed");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: sessionKeys.detail(sessionId),
        }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.stats() }),
        queryClient.invalidateQueries({
          queryKey: aiNotesKeys.detail(sessionId),
        }),
      ]);
      await refetch();

      setPreviewEditingContent(null);
      setIsPreviewOpen(false);
      setIncompletePrescriptionOpen(false);
      setPrescriptionCompletionIssues([]);
      toast.success("Consultation saved and marked as completed.");
      setSaveDialogOpen(true);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save consultation",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!sessionId || !session) return;

    if (isCompleted) {
      toast.info("Consultation is already completed.");
      return;
    }

    setIsSaving(true);
    try {
      if (
        isResumableRecording(session.status) &&
        ((session.recordingSegments?.length || 0) > 0 || session.audioUrl)
      ) {
        await recordingService.finalize(sessionId);
        toast.info("Merging segments and generating transcript / AI notes…");
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: sessionKeys.detail(sessionId),
          }),
          queryClient.invalidateQueries({ queryKey: sessionKeys.lists() }),
        ]);
        await refetch();
        return;
      }

      const medications = getCompletionMedications();
      const issues = findPrescriptionCompletionIssues(medications);
      if (issues.length > 0) {
        setPrescriptionCompletionIssues(issues);
        setIncompletePrescriptionOpen(true);
        return;
      }

      await completeConsultation(false);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save consultation",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReviewIncompletePrescription = () => {
    setIncompletePrescriptionOpen(false);
    setPrescriptionCompletionIssues([]);
    openPreview(undefined, { manualEdit: true });
  };

  const handleCompleteAnywayWithIncompletePrescription = async () => {
    await completeConsultation(true);
  };

  const handleExportPdf = async () => {
    if (!exportContent || !session) {
      toast.error(
        notesFailed
          ? "AI notes failed. Regenerate or Edit Notes before PDF."
          : "PDF is available after AI notes are ready.",
      );
      return;
    }

    try {
      setIsGeneratingPdf(true);
      await downloadAiNotesPdf(exportContent, session);
      toast.success("PDF generated successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to generate PDF. Please try again.",
      );
      openPreview("pdf");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <>
      <header className="glass flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-foreground">
              {getPatientFullName(patient)}
            </h2>
            <EncounterStatusBadge session={session} />
          </div>
          <p className="text-sm text-muted-foreground">
            {patientAge !== null ? `${patientAge} yrs` : "—"}
            {patient?.gender ? ` · ${formatGender(patient.gender)}` : ""}
            {getSessionDepartmentName(session)
              ? ` · ${getSessionDepartmentName(session)}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {session?.visitType === "inpatient" ||
          session?.encounter?.encounterType === "IP" ? (
            <HeaderActionButton
              icon={Stethoscope}
              label="Rounds"
              onClick={() => setRoundsOpen(true)}
            />
          ) : null}

          <HeaderActionButton
            icon={Eye}
            label="Preview"
            onClick={() => openPreview()}
            disabled={!canOpenNotes}
          />
          <HeaderActionButton
            icon={FileDown}
            label="Generate PDF"
            onClick={handleExportPdf}
            disabled={!canOpenNotes || isGeneratingPdf}
          />
          <HeaderActionButton
            icon={Printer}
            label="Print"
            onClick={() => openPreview("print")}
            disabled={!canOpenNotes}
          />

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !canSave}
            className="flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50 sm:px-4"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isCompleted ? "Completed" : "Save Consultation"}
            </span>
            <span className="sm:hidden">
              {isCompleted ? "Done" : "Save"}
            </span>
          </button>

          <span
            className={cn(
              "ml-1 font-mono text-sm font-medium",
              isRecording ? "text-destructive" : "text-foreground",
            )}
          >
            {formatTimer(elapsedSeconds)}
          </span>

          <div
            className={cn(
              "flex items-center gap-1.5 text-sm",
              saved
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden md:inline">
              {saved ? "Saved" : "Unsaved"}
            </span>
          </div>

          <Wifi className="hidden h-4 w-4 text-muted-foreground lg:block" />
          <ThemeToggle />
          <UserProfileDropdown />
        </div>
      </header>

      {exportContent && session && (
        <AiNotesPreviewModal
          open={isPreviewOpen}
          onOpenChange={(open) => {
            setIsPreviewOpen(open);
            if (!open) {
              setPreviewAutoAction(undefined);
              setPreviewAutoVoiceEdit(false);
              setPreviewAutoManualEdit(false);
              setPreviewEditingContent(null);
            }
          }}
          initialContent={exportContent}
          session={session}
          onSave={saveExportContent}
          onEditingContentChange={handlePreviewEditingContentChange}
          onNotesUpdated={(notes) => {
            queryClient.setQueryData(aiNotesKeys.detail(sessionId), notes);
            queryClient.setQueryData(
              sessionKeys.detail(sessionId),
              (current: unknown) => {
                if (!current || typeof current !== "object") return current;
                return { ...(current as object), aiNotes: notes };
              },
            );
            queryClient.invalidateQueries({
              queryKey: sessionKeys.detail(sessionId),
            });
            queryClient.invalidateQueries({
              queryKey: aiNotesKeys.detail(sessionId),
            });
          }}
          autoAction={previewAutoAction}
          autoVoiceEdit={previewAutoVoiceEdit}
          autoManualEdit={previewAutoManualEdit}
        />
      )}

      <RoundsDrawer
        sessionId={sessionId}
        open={roundsOpen}
        onOpenChange={setRoundsOpen}
      />

      {session && (
        <SaveConsultationDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          session={session}
          sessionId={sessionId}
        />
      )}

      <IncompletePrescriptionCompletionDialog
        open={incompletePrescriptionOpen}
        onOpenChange={(open) => {
          setIncompletePrescriptionOpen(open);
          if (!open) {
            setPrescriptionCompletionIssues([]);
          }
        }}
        issues={prescriptionCompletionIssues}
        isCompleting={isSaving}
        onReviewPrescription={handleReviewIncompletePrescription}
        onCompleteAnyway={handleCompleteAnywayWithIncompletePrescription}
      />
    </>
  );
}

function HeaderActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="glass-pill flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-50"
    >
      <Icon className="h-4 w-4" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
