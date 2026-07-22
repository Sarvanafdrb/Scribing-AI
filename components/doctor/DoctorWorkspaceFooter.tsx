"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
} from "@/utils/session-status.utils";
import { getPatientFullName } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import { cn } from "@/lib/utils";

interface DoctorWorkspaceFooterProps {
  sessionId: string;
}

export function DoctorWorkspaceFooter({ sessionId }: DoctorWorkspaceFooterProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, refetch } = useSession(sessionId);
  const { aiNotes, saveExportContent } = useAiNotes(sessionId);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewAutoAction, setPreviewAutoAction] = useState<
    "print" | "pdf" | undefined
  >(undefined);

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
    (canExport || isReviewReady(session?.status));
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
    if (session.status === "recording") return "Recording";
    return "In Progress";
  })();

  const openPreview = (action?: "print" | "pdf") => {
    if (!exportContent || !session) {
      toast.error("Preview is available after AI notes are generated.");
      return;
    }
    setPreviewAutoAction(action);
    setIsPreviewOpen(true);
  };

  const handleSave = async () => {
    if (!sessionId || !session) return;

    if (isCompleted) {
      toast.info("Consultation is already completed.");
      return;
    }

    setIsSaving(true);
    try {
      // Persist latest AI notes content if available (SOAP, diagnosis, meds, etc.)
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
      // Fall back to preview so the doctor can retry from the preview UI.
      openPreview("pdf");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => openPreview("print");

  const handleEditNotes = () => {
    router.push(`/sessions/${sessionId}/notes`);
  };

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
              onClick={() => toast.info("Voice edit coming soon")}
            />
            <FooterButton
              icon={Pencil}
              label="Edit Notes"
              variant="blue"
              onClick={handleEditNotes}
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
            if (!open) setPreviewAutoAction(undefined);
          }}
          initialContent={exportContent}
          session={session}
          onSave={saveExportContent}
          autoAction={previewAutoAction}
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
