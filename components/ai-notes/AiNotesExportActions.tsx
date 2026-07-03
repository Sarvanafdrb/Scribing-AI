"use client";

import { useMemo, useState } from "react";
import { Copy, FileDown, FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AiNotes } from "@/types/ai-notes.types";
import type { Session } from "@/types/session.types";
import {
  buildAiNotesExportContent,
  copyAiNotesToClipboard,
  downloadAiNotesDocx,
  downloadAiNotesPdf,
  hasExportableAiNotes,
  printAiNotes,
} from "@/utils/ai-notes-export.utils";
import { cn } from "@/lib/utils";

interface AiNotesExportActionsProps {
  aiNotes?: AiNotes;
  session?: Session;
  className?: string;
}

export function AiNotesExportActions({
  aiNotes,
  session,
  className,
}: AiNotesExportActionsProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const canExport = useMemo(
    () => Boolean(session && hasExportableAiNotes(aiNotes)),
    [aiNotes, session],
  );

  const exportContent = useMemo(() => {
    if (!session || !aiNotes || !canExport) return null;
    return buildAiNotesExportContent(aiNotes, session);
  }, [aiNotes, canExport, session]);

  const handleCopy = async () => {
    if (!exportContent) return;

    try {
      setIsCopying(true);
      await copyAiNotesToClipboard(exportContent);
      toast.success("Notes copied successfully.");
    } catch {
      toast.error("Unable to copy notes. Please try again.");
    } finally {
      setIsCopying(false);
    }
  };

  const handlePrint = async () => {
    if (!exportContent) return;

    try {
      setIsPrinting(true);
      printAiNotes(exportContent);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to open the print dialog. Please try again.",
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!exportContent || !session) return;

    try {
      setIsExportingPdf(true);
      await downloadAiNotesPdf(exportContent, session);
      toast.success("PDF exported successfully.");
    } catch {
      toast.error("Unable to export PDF. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportDocx = async () => {
    if (!exportContent || !session) return;

    try {
      setIsExportingDocx(true);
      await downloadAiNotesDocx(exportContent, session);
      toast.success("DOCX exported successfully.");
    } catch {
      toast.error("Unable to export DOCX. Please try again.");
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 rounded-xl border bg-white p-3",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={handleCopy}
        disabled={!canExport || isCopying}
      >
        {isCopying ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Copy className="mr-2 h-4 w-4" />
        )}
        Copy
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={handlePrint}
        disabled={!canExport || isPrinting}
      >
        {isPrinting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Printer className="mr-2 h-4 w-4" />
        )}
        Print
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={handleExportPdf}
        disabled={!canExport || isExportingPdf}
      >
        {isExportingPdf ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        Export PDF
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={handleExportDocx}
        disabled={!canExport || isExportingDocx}
      >
        {isExportingDocx ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        Export DOCX
      </Button>
    </div>
  );
}
