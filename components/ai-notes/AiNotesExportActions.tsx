"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, FileDown, FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AiNotesPreviewModal } from "@/components/ai-notes/AiNotesPreviewModal";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { AiNotes } from "@/types/ai-notes.types";
import type { Session } from "@/types/session.types";
import {
  buildAiNotesExportContent,
  copyAiNotesToClipboard,
  downloadAiNotesDocx,
  hasExportableAiNotes,
} from "@/utils/ai-notes-export.utils";
import type { AiNotesExportContent } from "@/utils/ai-notes-export.utils";
import { cn } from "@/lib/utils";

interface AiNotesExportActionsProps {
  aiNotes?: AiNotes;
  session?: Session;
  className?: string;
  onSaveNotes?: (content: AiNotesExportContent) => Promise<unknown>;
}

const getSessionId = (session: Session) => session._id || session.id;

export function AiNotesExportActions({
  aiNotes,
  session,
  className,
  onSaveNotes,
}: AiNotesExportActionsProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isCopying, setIsCopying] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const canExport = useMemo(
    () => Boolean(session && hasExportableAiNotes(aiNotes)),
    [aiNotes, session],
  );

  const exportContent = useMemo(() => {
    if (!session || !aiNotes || !canExport) return null;
    return buildAiNotesExportContent(aiNotes, session);
  }, [aiNotes, canExport, session]);

  const navigateToPreview = (action?: "print" | "pdf") => {
    const sessionId = session ? getSessionId(session) : undefined;
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

  const handleSaveFromPreview = async (content: AiNotesExportContent) => {
    if (!onSaveNotes) return;
    await onSaveNotes(content);
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap gap-2 rounded-xl border bg-white p-3",
          className,
        )}
      >
        <Button
          type="button"
          variant="default"
          size="sm"
          className="rounded-xl"
          onClick={() => openPreview()}
          disabled={!canExport}
        >
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>

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
          onClick={() => openPreview("print")}
          disabled={!canExport}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => openPreview("pdf")}
          disabled={!canExport}
        >
          <FileDown className="mr-2 h-4 w-4" />
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

      {isMobile && exportContent && session && (
        <AiNotesPreviewModal
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          initialContent={exportContent}
          session={session}
          onSave={handleSaveFromPreview}
        />
      )}
    </>
  );
}
