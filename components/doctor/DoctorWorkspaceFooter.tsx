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
} from "lucide-react";
import { toast } from "sonner";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { useSession } from "@/hooks/sessions/useSession";
import { AiNotesPreviewModal } from "@/components/ai-notes/AiNotesPreviewModal";
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
} from "@/utils/session-status.utils";
import { getPatientFullName } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import { cn } from "@/lib/utils";

interface DoctorWorkspaceFooterProps {
  sessionId: string;
}

export function DoctorWorkspaceFooter({ sessionId }: DoctorWorkspaceFooterProps) {
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

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const patientName = getPatientFullName(patient);
  const canExport = Boolean(session && hasExportableAiNotes(aiNotes));
  const isCompleted = isConsultationCompleted(session?.status);
  const canSave =
    Boolean(session) &&
    !isCompleted &&
    (canExport ||
      isReviewReady(session?.status) ||
      (isResumableRecording(session?.status) &&
        ((session?.recordingSegments?.length || 0) > 0 ||
          Boolean(session?.audioUrl))));
  const exportContent =
    session && aiNotes && canExport
      ? buildAiNotesExportContent(aiNotes, session)
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
      toast.error("This action is available after AI notes are generated.");
      return;
    }
    setPreviewAutoAction(action);
    setPreviewAutoVoiceEdit(Boolean(options?.voiceEdit));
    setPreviewAutoManualEdit(Boolean(options?.manualEdit));
    setIsPreviewOpen(true);
  };

  const handleVoiceEdit = () => {
    if (!canExport) {
      toast.error("Voice Edit is available after AI notes are generated.");
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

      if (exportContent) {
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
      await refetch();

      toast.success("Consultation saved and marked as completed.");
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
      toast.error("PDF is available after AI notes are generated.");
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
            <FooterButton
              icon={Mic}
              label="Voice Edit"
              variant="teal"
              onClick={handleVoiceEdit}
              disabled={!canExport || !isCompleted}
            />
            <FooterButton
              icon={Pencil}
              label="Edit Notes"
              variant="blue"
              onClick={handleEditNotes}
              disabled={!canExport}
            />
            <FooterButton
              icon={Eye}
              label="Preview"
              variant="outline"
              onClick={() => openPreview()}
              disabled={!canExport}
            />
            <FooterButton
              icon={FileDown}
              label="Generate PDF"
              variant="outline"
              onClick={handleExportPdf}
              disabled={!canExport || isGeneratingPdf}
            />
            <FooterButton
              icon={Printer}
              label="Print"
              variant="outline"
              onClick={handlePrint}
              disabled={!canExport}
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
        variant === "teal" &&
          "border-teal-200 text-teal-700 hover:bg-teal-50",
        variant === "blue" &&
          "border-blue-200 text-blue-700 hover:bg-blue-50",
        variant === "outline" &&
          "border-gray-200 text-gray-600 hover:bg-gray-50",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
