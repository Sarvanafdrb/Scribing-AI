"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Edit3,
  Loader2,
  Printer,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { Session } from "@/types/session.types";
import type { AiNotesExportContent } from "@/utils/ai-notes-export.utils";
import {
  PRESCRIPTION_SECTIONS,
  PRESCRIPTION_DOCUMENT_STYLES,
  buildAiNotesPrescriptionBodyHtml,
  createEmptyMedication,
  downloadAiNotesPdf,
  printAiNotes,
} from "@/utils/ai-notes-export.utils";
import { cn } from "@/lib/utils";

interface AiNotesPrescriptionPreviewProps {
  initialContent: AiNotesExportContent;
  session: Session;
  onSave?: (content: AiNotesExportContent) => Promise<unknown>;
  mode?: "page" | "modal";
  onBack?: () => void;
  onClose?: () => void;
  autoAction?: "print" | "pdf";
}

export function AiNotesPrescriptionPreview({
  initialContent,
  session,
  onSave,
  mode = "page",
  onBack,
  onClose,
  autoAction,
}: AiNotesPrescriptionPreviewProps) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const hasAutoActionRun = useRef(false);

  useEffect(() => {
    setContent(initialContent);
    setIsEditing(false);
  }, [initialContent]);

  const previewHtml = useMemo(
    () => buildAiNotesPrescriptionBodyHtml(content),
    [content],
  );

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
      medications: current.medications.filter((_, medIndex) => medIndex !== index),
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

  const pageActionButtons = (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      {isEditing ? (
        <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
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
            Edit
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

  const actionButtons = (
    <div className="flex flex-wrap items-center gap-2">
      {isEditing ? (
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsEditing(true)}
        >
          <Edit3 className="mr-2 h-4 w-4" />
          Edit
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
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
        onClick={handleGeneratePdf}
        disabled={isGeneratingPdf || isEditing}
      >
        {isGeneratingPdf ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Generate PDF
      </Button>
    </div>
  );

  const documentView = (
    <div
      className={cn(
        "w-full bg-white",
        mode === "page"
          ? "shadow-md"
          : "mx-auto max-w-[210mm] overflow-hidden rounded-xl border shadow-sm",
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
        mode === "page" ? "shadow-md" : "mx-auto max-w-4xl",
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
          <Button type="button" variant="outline" size="sm" onClick={addMedication}>
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
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
          {isEditing ? editForm : documentView}
        </div>
        <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" onClick={handleBack}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          {actionButtons}
        </div>
      </div>
    );
  }

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
                Review and edit the prescription layout before printing or
                exporting.
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
    </div>
  );
}
