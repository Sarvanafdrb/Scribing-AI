"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { healthcareSolid } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

const SOAP_SECTIONS = [
  {
    key: "subjective",
    label: "Subjective",
    description: "Patient-reported information",
  },
  {
    key: "objective",
    label: "Objective",
    description: "Observable clinical findings",
  },
  {
    key: "assessment",
    label: "Assessment",
    description: "Clinical impression",
  },
  { key: "plan", label: "Plan", description: "Treatment and follow-up" },
] as const;

const formatGeneratedAt = (value?: string) => {
  if (!value) return null;
  return new Date(value).toLocaleString();
};

const renderNoteContent = (content?: string) => {
  if (!content?.trim()) {
    return <p className="text-sm text-muted-foreground">No content available.</p>;
  }

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.every((line) => line.startsWith("-"))) {
    return (
      <ul className="space-y-1.5 text-sm text-slate-800">
        {lines.map((line, index) => (
          <li key={`${line}-${index}`}>{line.replace(/^-+\s*/, "• ")}</li>
        ))}
      </ul>
    );
  }

  return (
    <p className="text-sm whitespace-pre-wrap text-slate-800">{content}</p>
  );
};

export default function SessionNotesPage() {
  const { id } = useParams();
  const sessionId = id as string;
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const {
    aiNotes,
    isLoading,
    isGenerating,
    isFailed,
    isCompleted,
    transcriptReady,
    generate,
  } = useAiNotes(sessionId);

  const handleRegenerate = () => {
    setShowRegenerateDialog(false);
    generate(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading AI Notes...</p>
      </div>
    );
  }

  if (!transcriptReady) {
    return (
      <section className={cn(healthcareSolid.section, "space-y-3")}>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-700">AI Notes</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          A transcript is required before AI Notes can be generated. Complete
          recording and transcript generation first.
        </p>
      </section>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">AI Notes</h2>
            {isGenerating && (
              <Badge variant="outline" className="rounded-lg text-xs">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Generating
              </Badge>
            )}
            {isCompleted && !isGenerating && (
              <Badge className="rounded-lg bg-green-100 text-xs text-green-700 hover:bg-green-100">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Ready
              </Badge>
            )}
            {isFailed && !isGenerating && (
              <Badge variant="destructive" className="rounded-lg text-xs">
                Failed
              </Badge>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => {
              if (isCompleted) {
                setShowRegenerateDialog(true);
                return;
              }
              generate(true);
            }}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isFailed ? "Retry Generation" : "Regenerate"}
          </Button>
        </div>

        {isGenerating && (
          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-800">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div>
              <p className="font-medium">Generating AI Notes</p>
              <p className="text-xs text-blue-700/80">
                Creating a summary and concise SOAP notes from the transcript...
              </p>
            </div>
          </div>
        )}

        {isCompleted && !isGenerating && (
          <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <div>
              <p className="font-medium">AI Notes generated successfully</p>
              {aiNotes?.generatedAt && (
                <p className="text-xs text-green-700/80">
                  Generated {formatGeneratedAt(aiNotes.generatedAt)}
                </p>
              )}
            </div>
          </div>
        )}

        {isFailed && aiNotes?.error && !isGenerating && (
          <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{aiNotes.error}</p>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => generate(true)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        <section className={healthcareSolid.section}>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-900">AI Summary</h3>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            {isGenerating && !aiNotes?.summary
              ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating summary...
                </div>
              )
              : aiNotes?.summary || "Summary will appear here once generated."}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4">
          {SOAP_SECTIONS.map((section) => (
            <section key={section.key} className={healthcareSolid.section}>
              <div className="mb-2">
                <h3 className="text-base font-semibold text-slate-900">
                  {section.label}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {section.description}
                </p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                {isGenerating && !aiNotes?.[section.key]
                  ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </div>
                  )
                  : renderNoteContent(aiNotes?.[section.key])}
              </div>
            </section>
          ))}
        </div>
      </div>

      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate AI Notes?</DialogTitle>
            <DialogDescription>
              Regenerating AI Notes will replace the existing notes. Do you want
              to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegenerateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRegenerate}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
