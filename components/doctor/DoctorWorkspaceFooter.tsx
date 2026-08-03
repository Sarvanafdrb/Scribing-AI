"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  FileDown,
  HelpCircle,
  Loader2,
  Mic,
  Pencil,
  Printer,
  Save,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { useSession } from "@/hooks/sessions/useSession";
import { AiNotesPreviewModal } from "@/components/ai-notes/AiNotesPreviewModal";
import { RoundsDrawer } from "@/components/doctor/RoundsDrawer";
import { SaveConsultationDialog } from "@/components/doctor/SaveConsultationDialog";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import { sessionService } from "@/services/session.service";
import { recordingService } from "@/services/recording.service";
import { sessionKeys } from "@/services/session.queries";
import { aiNotesKeys } from "@/services/ai-notes.queries";
import {
  buildAiNotesExportContent,
  downloadAiNotesPdf,
  hasExportableAiNotes,
} from "@/utils/ai-notes-export.utils";
import {
  isConsultationCompleted,
  isReviewReady,
  isResumableRecording,
  isTranscriptAvailable,
} from "@/utils/session-status.utils";
import { getPatientFullName } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import type { AiNotes } from "@/types/ai-notes.types";
import { cn } from "@/lib/utils";

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

interface DoctorWorkspaceFooterProps {
  sessionId: string;
}

export function DoctorWorkspaceFooter({
  sessionId,
}: DoctorWorkspaceFooterProps) {
  const queryClient = useQueryClient();
  const { data: session, refetch } = useSession(sessionId);
  const { aiNotes, saveExportContent } = useAiNotes(sessionId);
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

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const patientName = getPatientFullName(patient);
  const hasRecording =
    (session?.recordingSegments?.length || 0) > 0 || Boolean(session?.audioUrl);
  const transcriptReady = isTranscriptAvailable(session?.status);
  const notesFailed = aiNotes?.status === "failed";
  const canExport = Boolean(session && hasExportableAiNotes(aiNotes));
  // Allow manual edit/preview once transcript exists — even if Gemini notes failed.
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

  const statusLabel = (() => {
    if (!session) return "Loading";
    if (isCompleted) return "Completed";
    if (session.status === "ready_for_review") return "Ready for Review";
    if (session.status === "ai_notes_generated") return "AI Notes Generated";
    if (session.status === "transcript_ready") return "Transcript Ready";
    if (session.status === "processing") return "Processing Transcript";
    if (session.status === "uploading") return "Uploading";
    if (session.status === "interrupted") return "Interrupted";
    if (session.status === "paused") return "Paused";
    if (session.status === "resumed") return "Resumed";
    if (session.status === "recording") return "Recording";
    return "In Progress";
  })();

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

  const handleVoiceEdit = () => {
    if (!canExport) {
      toast.error(
        notesFailed
          ? "AI notes failed (API quota). Regenerate notes, then use Voice Edit."
          : "Voice Edit is available after AI notes are generated.",
      );
      return;
    }
    if (!isCompleted) {
      toast.info(
        "Save the consultation as Completed first, then use Voice Edit from Preview.",
      );
      return;
    }
    openPreview(undefined, { voiceEdit: true });
  };

  const handleEditNotes = () => {
    openPreview(undefined, { manualEdit: true });
  };

  const handleSave = async () => {
    if (!sessionId || !session) return;

    if (isCompleted) {
      toast.info("Consultation is already completed.");
      return;
    }

    setIsSaving(true);
    try {
      // If audio segments exist but pipeline never finalized, merge + generate first.
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
        setIsSaving(false);
        return;
      }

      // Only persist notes payload when there is real content (avoid wiping failed/empty).
      if (exportContent && canExport) {
        await saveExportContent(exportContent);
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
      // Refresh encounter bundle (round schedule / next-round flags) before dialog.
      const refreshed = await refetch();
      void refreshed;

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

  const handlePrint = () => openPreview("print");

  return (
    <>
      <footer className="border-t border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Consultation · {patientName} · {statusLabel}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {session?.visitType === "inpatient" ||
            session?.encounter?.encounterType === "IP" ? (
              <FooterButton
                icon={Stethoscope}
                label="Rounds"
                variant="outline"
                onClick={() => setRoundsOpen(true)}
              />
            ) : null}
            {/* <FooterButton
              icon={Mic}
              label="Voice Edit"
              variant="teal"
              onClick={handleVoiceEdit}
              disabled={!canExport || !isCompleted}
            /> */}
            {/* <FooterButton
              icon={Pencil}
              label="Edit Notes"
              variant="blue"
              onClick={handleEditNotes}
              disabled={!canOpenNotes}
            /> */}
            <FooterButton
              icon={Eye}
              label="Preview"
              variant="outline"
              onClick={() => openPreview()}
              disabled={!canOpenNotes}
            />
            <FooterButton
              icon={FileDown}
              label="Generate PDF"
              variant="outline"
              onClick={handleExportPdf}
              disabled={!canOpenNotes || isGeneratingPdf}
            />
            <FooterButton
              icon={Printer}
              label="Print"
              variant="outline"
              onClick={handlePrint}
              disabled={!canOpenNotes}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !canSave}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isCompleted ? "Completed" : "Save Consultation"}
            </button>
          </div>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50"
            aria-label="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {exportContent && session && (
        <AiNotesPreviewModal
          open={isPreviewOpen}
          onOpenChange={(open) => {
            setIsPreviewOpen(open);
            if (!open) {
              setPreviewAutoAction(undefined);
              setPreviewAutoVoiceEdit(false);
              setPreviewAutoManualEdit(false);
            }
          }}
          initialContent={exportContent}
          session={session}
          onSave={saveExportContent}
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
    </>
  );
}

function FooterButton({
  icon: Icon,
  label,
  variant,
  onClick,
  disabled,
}: {
  icon: typeof Mic;
  label: string;
  variant: "teal" | "blue" | "outline";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium disabled:opacity-50",
        variant === "teal" && "border-teal-200 text-teal-700 hover:bg-teal-50",
        variant === "blue" && "border-blue-200 text-blue-700 hover:bg-blue-50",
        variant === "outline" &&
          "border-gray-200 text-gray-600 hover:bg-gray-50",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
