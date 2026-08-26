"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AiNotesPreviewModal } from "@/components/ai-notes/AiNotesPreviewModal";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { useSession } from "@/hooks/sessions/useSession";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import { aiNotesKeys } from "@/services/ai-notes.queries";
import { sessionKeys } from "@/services/session.queries";
import {
  buildAiNotesExportContent,
  hasExportableAiNotes,
} from "@/utils/ai-notes-export.utils";
import {
  isReviewReady,
  isTranscriptAvailable,
} from "@/utils/session-status.utils";
import type { AiNotes } from "@/types/ai-notes.types";

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

interface DoctorWorkspaceModalsProps {
  sessionId: string;
}

export function DoctorWorkspaceModals({ sessionId }: DoctorWorkspaceModalsProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession(sessionId);
  const { aiNotes, saveExportContent } = useAiNotes(sessionId);
  const notesPreviewNonce = useEncounterUiStore((s) => s.notesPreviewNonce);
  const prescriptionSuggestQuery = useEncounterUiStore(
    (s) => s.prescriptionSuggestQuery,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewAutoManualEdit, setPreviewAutoManualEdit] = useState(false);

  const canExport = Boolean(session && hasExportableAiNotes(aiNotes));
  const transcriptReady = isTranscriptAvailable(session?.status);
  const canOpenNotes = Boolean(session) && (canExport || transcriptReady);
  const exportContent = session
    ? buildAiNotesExportContent(
        canExport && aiNotes
          ? aiNotes
          : { ...EMPTY_AI_NOTES, ...aiNotes, status: "completed" },
        session,
      )
    : null;

  useEffect(() => {
    if (!notesPreviewNonce || !session) return;
    setPreviewAutoManualEdit(true);
    setIsPreviewOpen(true);
    if (!canOpenNotes) {
      toast.message("Start drafting notes and prescription manually.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesPreviewNonce]);

  if (!exportContent || !session) {
    return null;
  }

  return (
    <AiNotesPreviewModal
      open={isPreviewOpen}
      onOpenChange={(open) => {
        setIsPreviewOpen(open);
        if (!open) {
          setPreviewAutoManualEdit(false);
        }
      }}
      initialContent={exportContent}
      session={session}
      onSave={saveExportContent}
      onNotesUpdated={(notes) => {
        queryClient.setQueryData(aiNotesKeys.detail(sessionId), notes);
        queryClient.setQueryData(sessionKeys.detail(sessionId), (current: unknown) => {
          if (!current || typeof current !== "object") return current;
          return { ...(current as object), aiNotes: notes };
        });
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
        queryClient.invalidateQueries({ queryKey: aiNotesKeys.detail(sessionId) });
        if (isReviewReady(session.status)) {
          queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
        }
      }}
      autoManualEdit={previewAutoManualEdit}
      autoSuggestCondition={prescriptionSuggestQuery || undefined}
    />
  );
}
