"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
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
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  buildAiNotesExportContent,
  hasExportableAiNotes,
} from "@/utils/ai-notes-export.utils";
import { getPatientFullName } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import { cn } from "@/lib/utils";

interface DoctorWorkspaceFooterProps {
  sessionId: string;
}

export function DoctorWorkspaceFooter({ sessionId }: DoctorWorkspaceFooterProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { data: session } = useSession(sessionId);
  const { aiNotes, saveExportContent } = useAiNotes(sessionId);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const patientName = getPatientFullName(patient);
  const canExport = Boolean(session && hasExportableAiNotes(aiNotes));
  const exportContent =
    session && aiNotes && canExport
      ? buildAiNotesExportContent(aiNotes, session)
      : null;

  const navigateToPreview = (action?: "print" | "pdf") => {
    if (!sessionId) return;
    const query = action ? `?action=${action}` : "";
    router.push(`/sessions/${sessionId}/preview${query}`);
  };

  const openPreview = (action?: "print" | "pdf") => {
    if (isMobile) {
      setIsPreviewOpen(true);
      return;
    }
    navigateToPreview(action);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      toast.success("Consultation saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = () => openPreview("pdf");
  const handlePrint = () => openPreview("print");

  const handleEditNotes = () => {
    router.push(`/sessions/${sessionId}/notes`);
  };

  return (
    <>
      <footer className="border-t border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Consultation · {patientName} · Ready
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
              icon={FileDown}
              label="Generate PDF"
              variant="outline"
              onClick={handleExportPdf}
              disabled={!canExport}
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
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Consultation
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

      {isMobile && exportContent && session && (
        <AiNotesPreviewModal
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          initialContent={exportContent}
          session={session}
          onSave={saveExportContent}
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
