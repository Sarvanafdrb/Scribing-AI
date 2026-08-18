"use client";

import { useState } from "react";
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
  onEditingContentChange?: (content: AiNotesExportContent | null) => void;
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
  onEditingContentChange,
}: AiNotesPreviewModalProps) {
  const [voiceFlowActive, setVoiceFlowActive] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Nested Voice Edit / Review dialogs can bubble a false close to the
        // parent Preview — keep Preview open until that flow finishes.
        if (!next && voiceFlowActive) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex h-[95vh] w-[95vw] max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-2xl border border-border p-0 shadow-2xl ring-0 sm:max-w-none"
        onPointerDownOutside={(event) => {
          if (voiceFlowActive) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (voiceFlowActive) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (voiceFlowActive) event.preventDefault();
        }}
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
            onClose={() => {
              if (!voiceFlowActive) onOpenChange(false);
            }}
            autoAction={autoAction}
            autoVoiceEdit={autoVoiceEdit}
            autoManualEdit={autoManualEdit}
            onVoiceFlowActiveChange={setVoiceFlowActive}
            onEditingContentChange={onEditingContentChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
