"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { AiNotesPrescriptionPreview } from "@/components/ai-notes/AiNotesPrescriptionPreview";
import type { AiNotes } from "@/types/ai-notes.types";
import type { Session } from "@/types/session.types";
import type { AiNotesExportContent } from "@/utils/ai-notes-export.utils";

interface AiNotesPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent: AiNotesExportContent;
  session: Session;
  onSave?: (content: AiNotesExportContent) => Promise<unknown>;
  onNotesUpdated?: (notes: AiNotes) => void;
  autoAction?: "print" | "pdf";
  autoVoiceEdit?: boolean;
  autoManualEdit?: boolean;
}

export function AiNotesPreviewModal({
  open,
  onOpenChange,
  initialContent,
  session,
  onSave,
  onNotesUpdated,
  autoAction,
  autoVoiceEdit,
  autoManualEdit,
}: AiNotesPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex h-[95vh] w-[95vw] max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Consultation Preview</DialogTitle>
        <DialogDescription className="sr-only">
          Fullscreen consultation document preview with print and PDF export.
        </DialogDescription>

        {open && (
          <AiNotesPrescriptionPreview
            mode="modal"
            initialContent={initialContent}
            session={session}
            onSave={onSave}
            onNotesUpdated={onNotesUpdated}
            onClose={() => onOpenChange(false)}
            autoAction={autoAction}
            autoVoiceEdit={autoVoiceEdit}
            autoManualEdit={autoManualEdit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
