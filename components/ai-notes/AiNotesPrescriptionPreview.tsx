"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Edit3,
  Loader2,
  Mic,
  Minus,
  Plus,
  Printer,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceEditDialog } from "@/components/ai-notes/VoiceEditDialog";
import { VoiceEditReview } from "@/components/ai-notes/VoiceEditReview";
import type {
  AiNotes,
  AiNotesMedication,
  VoiceEditPreviewResult,
} from "@/types/ai-notes.types";
import type { Session } from "@/types/session.types";
import type { AiNotesExportContent } from "@/utils/ai-notes-export.utils";
import {
  PRESCRIPTION_SECTIONS,
  PRESCRIPTION_DOCUMENT_STYLES,
  buildAiNotesExportContent,
  buildAiNotesPrescriptionBodyHtml,
  createEmptyMedication,
  downloadAiNotesPdf,
  printAiNotes,
} from "@/utils/ai-notes-export.utils";
import { cn } from "@/lib/utils";
import { isConsultationCompleted } from "@/utils/session-status.utils";

interface AiNotesPrescriptionPreviewProps {
  initialContent: AiNotesExportContent;
  session: Session;
  onSave?: (content: AiNotesExportContent) => Promise<unknown>;
  onNotesUpdated?: (notes: AiNotes) => void;
  mode?: "page" | "modal";
  onBack?: () => void;
  onClose?: () => void;
  autoAction?: "print" | "pdf";
  autoVoiceEdit?: boolean;
  autoManualEdit?: boolean;
}

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

export function AiNotesPrescriptionPreview({
  initialContent,
  session,
  onSave,
  onNotesUpdated,
  mode = "page",
  onBack,
  onClose,
  autoAction,
  autoVoiceEdit = false,
  autoManualEdit = false,
}: AiNotesPrescriptionPreviewProps) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(Boolean(autoManualEdit));
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [paperHeight, setPaperHeight] = useState(0);
  const [isVoiceEditOpen, setIsVoiceEditOpen] = useState(false);
  const [isVoiceReviewOpen, setIsVoiceReviewOpen] = useState(false);
  const [voicePreview, setVoicePreview] =
    useState<VoiceEditPreviewResult | null>(null);
  const hasAutoActionRun = useRef(false);
  const hasAutoVoiceEditRun = useRef(false);
  const hasAutoManualEditRun = useRef(Boolean(autoManualEdit));
  const paperRef = useRef<HTMLDivElement>(null);

  const sessionId = String(session._id || session.id || "");
  const canVoiceEdit = isConsultationCompleted(session.status);

  // Sync latest notes into the viewer, but never wipe in-progress Manual Edit.
  useEffect(() => {
    if (isEditing) return;
    setContent(initialContent);
  }, [initialContent, isEditing]);

  const previewHtml = useMemo(
    () => buildAiNotesPrescriptionBodyHtml(content),
    [content],
  );

  const patientName = content.metadata.patientName || "—";
  const sessionDate = content.metadata.documentDate || "—";

  useLayoutEffect(() => {
    if (isEditing || !paperRef.current) {
      setPaperHeight(0);
      return;
    }
    setPaperHeight(paperRef.current.offsetHeight);
  }, [previewHtml, isEditing, mode]);

  const updateSection = (key: keyof AiNotesExportContent, value: string) => {
    setContent((current) => ({ ...current, [key]: value }));
  };

  const updateMedication = (
    index: number,
    field: keyof AiNotesMedication,
    value: string,
  ) => {
    setContent((current) => ({
      ...current,
      medications: current.medications.map((medication, medIndex) =>
        medIndex === index ? { ...medication, [field]: value } : medication,
      ),
    }));
  };

  const addMedication = () => {
    setContent((current) => ({
      ...current,
      medications: [...current.medications, createEmptyMedication()],
    }));
  };

  const removeMedication = (index: number) => {
    setContent((current) => ({
      ...current,
      medications: current.medications.filter(
        (_, medIndex) => medIndex !== index,
      ),
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (onSave) {
        await onSave(content);
      }
      setIsEditing(false);
      toast.success("Changes saved successfully.");
    } catch {
      toast.error("Unable to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      printAiNotes(content);
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

  const handleGeneratePdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await downloadAiNotesPdf(content, session);
      toast.success("PDF generated successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to generate PDF. Please try again.",
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCancelEdit = () => {
    setContent(initialContent);
    setIsEditing(false);
  };

  const handleBack = () => {
    if (isEditing) {
      handleCancelEdit();
      return;
    }
    if (onBack) {
      onBack();
      return;
    }
    onClose?.();
  };

  const adjustZoom = (next: number) => {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    setZoom(Number(clamped.toFixed(2)));
  };

  useEffect(() => {
    hasAutoActionRun.current = false;
  }, [autoAction, session.id || session._id]);

  useEffect(() => {
    hasAutoVoiceEditRun.current = false;
  }, [autoVoiceEdit, session.id || session._id]);

  useEffect(() => {
    hasAutoManualEditRun.current = false;
  }, [autoManualEdit, session.id || session._id]);

  useEffect(() => {
    if (!autoAction || isEditing || hasAutoActionRun.current) return;

    hasAutoActionRun.current = true;

    const runAction = async () => {
      if (autoAction === "print") {
        await handlePrint();
        return;
      }
      await handleGeneratePdf();
    };

    void runAction();
  }, [autoAction, isEditing]);

  useEffect(() => {
    if (!autoVoiceEdit || hasAutoVoiceEditRun.current || isEditing) return;
    if (!canVoiceEdit) return;
    hasAutoVoiceEditRun.current = true;
    setIsVoiceEditOpen(true);
  }, [autoVoiceEdit, canVoiceEdit, isEditing]);

  useEffect(() => {
    if (!autoManualEdit || hasAutoManualEditRun.current) return;
    hasAutoManualEditRun.current = true;
    setIsEditing(true);
  }, [autoManualEdit]);

  const handleOpenVoiceEdit = () => {
    if (!canVoiceEdit) {
      toast.info(
        "Voice Edit is available after the consultation is saved as Completed.",
      );
      return;
    }
    if (isEditing) {
      toast.info("Finish or cancel Manual Edit before using Voice Edit.");
      return;
    }
    setIsVoiceEditOpen(true);
  };

  const handleVoicePreviewReady = (preview: VoiceEditPreviewResult) => {
    setVoicePreview(preview);
    setIsVoiceReviewOpen(true);
  };

  const handleVoiceAccepted = (aiNotes: AiNotes) => {
    const nextSession = {
      ...session,
      aiNotes,
    };
    setContent(buildAiNotesExportContent(aiNotes, nextSession));
    setVoicePreview(null);
    onNotesUpdated?.(aiNotes);
  };

  const voiceEditOverlays = (
    <>
      <VoiceEditDialog
        open={isVoiceEditOpen}
        sessionId={sessionId}
        onOpenChange={setIsVoiceEditOpen}
        onPreviewReady={handleVoicePreviewReady}
      />
      <VoiceEditReview
        open={isVoiceReviewOpen}
        sessionId={sessionId}
        preview={voicePreview}
        onOpenChange={setIsVoiceReviewOpen}
        onAccepted={handleVoiceAccepted}
        onContinueVoiceEdit={() => setIsVoiceEditOpen(true)}
      />
    </>
  );

  const zoomControls = (
    <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-8 w-8 text-gray-600"
        onClick={() => adjustZoom(zoom - ZOOM_STEP)}
        disabled={isEditing || zoom <= ZOOM_MIN}
        aria-label="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <button
        type="button"
        onClick={() => setZoom(1)}
        disabled={isEditing}
        className="min-w-[3.25rem] rounded-md px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-white disabled:opacity-50"
        aria-label="Reset zoom to 100 percent"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-8 w-8 text-gray-600"
        onClick={() => adjustZoom(zoom + ZOOM_STEP)}
        disabled={isEditing || zoom >= ZOOM_MAX}
        aria-label="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );

  const primaryActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isEditing ? (
        <Button
          type="button"
          size="sm"
          className="rounded-xl bg-teal-600 text-white hover:bg-teal-700"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-gray-200"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Manual Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50"
            onClick={handleOpenVoiceEdit}
            disabled={!canVoiceEdit}
          >
            <Mic className="mr-2 h-4 w-4" />
            Voice Edit
          </Button>
        </>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl border-gray-200"
        onClick={handlePrint}
        disabled={isPrinting || isEditing}
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
        size="sm"
        className="rounded-xl bg-teal-600 text-white hover:bg-teal-700"
        onClick={handleGeneratePdf}
        disabled={isGeneratingPdf || isEditing}
      >
        {isGeneratingPdf ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Export PDF
      </Button>
    </div>
  );

  const documentView = (
    <div
      ref={paperRef}
      className={cn(
        "w-full bg-white",
        mode === "page"
          ? "shadow-md"
          : "overflow-hidden rounded-sm shadow-[0_8px_30px_rgba(15,23,42,0.12)]",
      )}
    >
      <style>{PRESCRIPTION_DOCUMENT_STYLES}</style>
      <div
        className="prescription-preview"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
    </div>
  );

  const editForm = (
    <div
      className={cn(
        "w-full space-y-4 rounded-xl border bg-white p-6",
        mode === "page" ? "shadow-md" : "shadow-sm",
      )}
    >
      {PRESCRIPTION_SECTIONS.map((section) => (
        <div key={section.key} className="space-y-2">
          <Label htmlFor={`${mode}-${section.key}`}>{section.label}</Label>
          <Textarea
            id={`${mode}-${section.key}`}
            value={content[section.key] || ""}
            onChange={(event) => updateSection(section.key, event.target.value)}
            rows={4}
            className="resize-y"
          />
        </div>
      ))}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Medications</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMedication}
          >
            Add Medicine
          </Button>
        </div>

        {content.medications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medications added.</p>
        ) : (
          <div className="space-y-3">
            {content.medications.map((medication, index) => (
              <div
                key={`medication-${index}`}
                className="grid gap-2 rounded-lg border p-3 md:grid-cols-6"
              >
                <Input
                  placeholder="Medicine"
                  value={medication.medicine}
                  onChange={(event) =>
                    updateMedication(index, "medicine", event.target.value)
                  }
                  className="md:col-span-2"
                />
                <Input
                  placeholder="Morning"
                  value={medication.morning || ""}
                  onChange={(event) =>
                    updateMedication(index, "morning", event.target.value)
                  }
                />
                <Input
                  placeholder="Afternoon"
                  value={medication.afternoon || ""}
                  onChange={(event) =>
                    updateMedication(index, "afternoon", event.target.value)
                  }
                />
                <Input
                  placeholder="Night"
                  value={medication.night || ""}
                  onChange={(event) =>
                    updateMedication(index, "night", event.target.value)
                  }
                />
                <Input
                  placeholder="Days"
                  value={medication.days || ""}
                  onChange={(event) =>
                    updateMedication(index, "days", event.target.value)
                  }
                />
                <Input
                  placeholder="Instructions"
                  value={medication.instructions || ""}
                  onChange={(event) =>
                    updateMedication(index, "instructions", event.target.value)
                  }
                  className="md:col-span-5"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="md:col-span-1"
                  onClick={() => removeMedication(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (mode === "modal") {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
        <header className="sticky top-0 z-20 shrink-0 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-xl px-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                onClick={handleBack}
              >
                {isEditing ? (
                  <>
                    <X className="mr-1.5 h-4 w-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Back
                  </>
                )}
              </Button>

              <div className="min-w-0 border-l border-gray-200 pl-3 sm:pl-4">
                <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
                  Consultation Preview
                </h2>
                <p className="mt-0.5 truncate text-xs text-gray-500 sm:text-sm">
                  <span className="font-medium text-gray-700">
                    {patientName}
                  </span>
                  <span className="mx-1.5 text-gray-300">·</span>
                  <span>{sessionDate}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
              {!isEditing && zoomControls}
              {primaryActions}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#e8eaed]">
          <div className="mx-auto flex w-full max-w-[1200px] justify-center px-4 py-8 sm:px-8 sm:py-10">
            {isEditing ? (
              <div className="w-full max-w-4xl">{editForm}</div>
            ) : (
              <div
                className="flex justify-center"
                style={{
                  width: `min(100%, calc(210mm * ${zoom}))`,
                  height: paperHeight ? `${paperHeight * zoom}px` : undefined,
                }}
              >
                <div
                  style={{
                    width: "min(210mm, 100%)",
                    transform: `scale(${zoom})`,
                    transformOrigin: "top center",
                  }}
                >
                  {documentView}
                </div>
              </div>
            )}
          </div>
        </div>
        {voiceEditOverlays}
      </div>
    );
  }

  const pageActionButtons = (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      {isEditing ? (
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      ) : (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Manual Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOpenVoiceEdit}
            disabled={!canVoiceEdit}
          >
            <Mic className="mr-2 h-4 w-4" />
            Voice Edit
          </Button>
          <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
            |
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            Print
          </Button>
          <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
            |
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Generate PDF
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-6 px-6 py-3 lg:pl-14 lg:pr-10">
          <div className="flex min-w-0 items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 px-2"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <div className="min-w-0 border-l border-slate-200 pl-4">
              <h1 className="text-base font-semibold text-slate-900">
                AI Notes Preview
              </h1>
              <p className="text-sm text-slate-500">
                {patientName} · {sessionDate}
              </p>
            </div>
          </div>
          {pageActionButtons}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-10 lg:pl-14 lg:pr-10">
        <div
          className={cn(
            "mx-auto w-full",
            isEditing ? "max-w-4xl" : "max-w-[210mm]",
          )}
        >
          {isEditing ? editForm : documentView}
        </div>
      </div>
      {voiceEditOverlays}
    </div>
  );
}
