"use client";



import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogHeader,

  DialogTitle,

} from "@/components/ui/dialog";

import { AiNotesPrescriptionPreview } from "@/components/ai-notes/AiNotesPrescriptionPreview";

import type { Session } from "@/types/session.types";

import type { AiNotesExportContent } from "@/utils/ai-notes-export.utils";



interface AiNotesPreviewModalProps {

  open: boolean;

  onOpenChange: (open: boolean) => void;

  initialContent: AiNotesExportContent;

  session: Session;

  onSave?: (content: AiNotesExportContent) => Promise<unknown>;

}



export function AiNotesPreviewModal({

  open,

  onOpenChange,

  initialContent,

  session,

  onSave,

}: AiNotesPreviewModalProps) {

  return (

    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="flex max-h-[92vh] w-[min(96vw,1100px)] max-w-none flex-col gap-0 overflow-hidden p-0">

        <DialogHeader className="border-b px-6 py-4">

          <DialogTitle>AI Notes Preview</DialogTitle>

          <DialogDescription>

            Review and edit the prescription layout before printing or exporting.

          </DialogDescription>

        </DialogHeader>



        {open && (

          <AiNotesPrescriptionPreview

            mode="modal"

            initialContent={initialContent}

            session={session}

            onSave={onSave}

            onClose={() => onOpenChange(false)}

          />

        )}

      </DialogContent>

    </Dialog>

  );

}

