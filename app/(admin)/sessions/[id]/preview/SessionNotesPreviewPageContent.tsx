"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AiNotesPrescriptionPreview } from "@/components/ai-notes/AiNotesPrescriptionPreview";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import {
  buildAiNotesExportContent,
  hasExportableAiNotes,
} from "@/utils/ai-notes-export.utils";

export default function SessionNotesPreviewPageContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = id as string;

  const { session, aiNotes, isLoading, saveExportContent } =
    useAiNotes(sessionId);

  const exportContent = useMemo(() => {
    if (!session || !aiNotes || !hasExportableAiNotes(aiNotes)) return null;
    return buildAiNotesExportContent(aiNotes, session);
  }, [aiNotes, session]);

  const autoAction = searchParams.get("action");
  const resolvedAutoAction =
    autoAction === "print" || autoAction === "pdf" ? autoAction : undefined;

  useEffect(() => {
    if (isLoading) return;
    if (!exportContent || !session) {
      router.replace(`/sessions/${sessionId}/notes`);
    }
  }, [exportContent, isLoading, router, session, sessionId]);

  if (isLoading || !exportContent || !session) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading preview...</p>
      </div>
    );
  }

  return (
    <AiNotesPrescriptionPreview
      mode="page"
      initialContent={exportContent}
      session={session}
      onSave={saveExportContent}
      onBack={() => router.push(`/sessions/${sessionId}/notes`)}
      autoAction={resolvedAutoAction}
    />
  );
}
