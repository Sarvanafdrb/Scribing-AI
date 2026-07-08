"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import SessionNotesPreviewPageContent from "./SessionNotesPreviewPageContent";

export default function SessionNotesPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        </div>
      }
    >
      <SessionNotesPreviewPageContent />
    </Suspense>
  );
}
