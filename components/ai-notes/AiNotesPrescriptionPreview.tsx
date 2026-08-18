"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceEditDialog } from "@/components/ai-notes/VoiceEditDialog";
import { VoiceEditReview } from "@/components/ai-notes/VoiceEditReview";
import { MedicationConditionSearch } from "@/components/ai-notes/MedicationConditionSearch";
import type {
  AiNotes,
  AiNotesMedication,
  VoiceEditPreviewResult,
} from "@/types/ai-notes.types";
import type { MedicineSearchResult } from "@/types/medicine.types";
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
import { useAccessControl } from "@/hooks/useAccessControl";
import { medicineService } from "@/services/medicine.service";
import { medicineKeys } from "@/services/medicine.queries";
import {
  formatMedicationDuplicateLabel,
  validatePrescriptionMedications,
  wouldDuplicateMedication,
} from "@/utils/prescriptionMedication.utils";
import {
  formatEditableMedicationPrice,
  formatPrescriptionPrice,
  getEditableMedicationPrice,
  getMedicationDisplayName,
  getSavedMedicationPrice,
  isUnsavedCatalogMedicationPrice,
} from "@/utils/prescriptionPrice.utils";

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
  /** Parent Preview modal must stay open while Voice Edit / Review is active. */
  onVoiceFlowActiveChange?: (active: boolean) => void;
  /** Reports in-progress manual edit content for consultation completion sync. */
  onEditingContentChange?: (content: AiNotesExportContent | null) => void;
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
  onVoiceFlowActiveChange,
  onEditingContentChange,
}: AiNotesPrescriptionPreviewProps) {
  const { canEditAiNotes } = useAccessControl();
  const isCompleted = isConsultationCompleted(session.status);
  const canEditPrescription = canEditAiNotes() && !isCompleted;
  const canVoiceEdit = isCompleted && canEditAiNotes();

  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(
    Boolean(autoManualEdit && canEditPrescription),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [paperHeight, setPaperHeight] = useState(0);
  const [isVoiceEditOpen, setIsVoiceEditOpen] = useState(false);
  const [isVoiceReviewOpen, setIsVoiceReviewOpen] = useState(false);
  const [voicePreview, setVoicePreview] =
    useState<VoiceEditPreviewResult | null>(null);
  const [medicationValidation, setMedicationValidation] = useState<{
    index: number;
    message: string;
  } | null>(null);
  const hasAutoActionRun = useRef(false);
  const hasAutoVoiceEditRun = useRef(false);
  const hasAutoManualEditRun = useRef(Boolean(autoManualEdit));
  const paperRef = useRef<HTMLDivElement>(null);

  const sessionId = String(session._id || session.id || "");

  // Sync latest notes into the viewer, but never wipe in-progress Manual Edit.
  useEffect(() => {
    if (isEditing) return;
    setContent(initialContent);
  }, [initialContent, isEditing]);

  useEffect(() => {
    if (!canEditPrescription && isEditing) {
      setIsEditing(false);
    }
  }, [canEditPrescription, isEditing]);

  useEffect(() => {
    if (!onEditingContentChange) return;
    onEditingContentChange(isEditing ? content : null);
  }, [content, isEditing, onEditingContentChange]);

  useEffect(
    () => () => {
      onEditingContentChange?.(null);
    },
    [onEditingContentChange],
  );

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
    if (!canEditPrescription) return;
    setContent((current) => ({ ...current, [key]: value }));
  };

  const updateMedication = (
    index: number,
    field: keyof AiNotesMedication,
    value: string,
  ) => {
    if (!canEditPrescription) return;
    setMedicationValidation(null);
    setContent((current) => ({
      ...current,
      medications: current.medications.map((medication, medIndex) =>
        medIndex === index ? { ...medication, [field]: value } : medication,
      ),
    }));
  };

  const addMedication = () => {
    if (!canEditPrescription) return;
    setMedicationValidation(null);
    setContent((current) => ({
      ...current,
      medications: [...current.medications, createEmptyMedication()],
    }));
  };

  const addMedicineFromCatalog = (medicine: MedicineSearchResult) => {
    if (!canEditPrescription) {
      toast.info("Prescription editing is not available.");
      return;
    }
    setMedicationValidation(null);
    setContent((current) => {
      const displayName = medicine.strength
        ? `${medicine.name} ${medicine.strength}`.trim()
        : medicine.name;

      const candidate = {
        ...createEmptyMedication(),
        medicine: displayName,
        medicineId: medicine.id,
        medicineNameSnapshot: medicine.name,
        strengthSnapshot: medicine.strength || "",
        catalogCostPreview: medicine.cost,
      };

      if (wouldDuplicateMedication(candidate, current.medications)) {
        toast.error(
          `Duplicate medication: ${formatMedicationDuplicateLabel(candidate)} is already in this prescription.`,
        );
        return current;
      }

      return {
        ...current,
        medications: [...current.medications, candidate],
      };
    });
    if (!isEditing) {
      setIsEditing(true);
    }
    toast.success(`${medicine.name} added to prescription`);
  };

  const removeMedication = (index: number) => {
    if (!canEditPrescription) return;
    setMedicationValidation(null);
    setContent((current) => ({
      ...current,
      medications: current.medications.filter(
        (_, medIndex) => medIndex !== index,
      ),
    }));
  };

  const organizationId = useMemo(() => {
    if (!session) return undefined;
    if (typeof session.organizationId === "object" && session.organizationId) {
      return (
        (session.organizationId as { id?: string; _id?: string }).id ||
        (session.organizationId as { id?: string; _id?: string })._id
      );
    }
    return typeof session.organizationId === "string"
      ? session.organizationId
      : undefined;
  }, [session]);

  const excludedMedicineIds = useMemo(
    () =>
      content.medications
        .map((medication) => medication.medicineId || "")
        .filter(Boolean),
    [content.medications],
  );

  const catalogMedicineIds = useMemo(
    () =>
      [
        ...new Set(
          content.medications
            .map((medication) => medication.medicineId?.trim())
            .filter(Boolean),
        ),
      ] as string[],
    [content.medications],
  );

  const medicineStatusQuery = useQuery({
    queryKey: [...medicineKeys.all, "prescription-status", catalogMedicineIds],
    queryFn: async () => {
      const entries = await Promise.all(
        catalogMedicineIds.map(async (id) => {
          try {
            const medicine = await medicineService.getById(id);
            return [id, medicine.isActive !== false] as const;
          } catch {
            return [id, true] as const;
          }
        }),
      );
      return new Map(entries);
    },
    enabled: catalogMedicineIds.length > 0,
    staleTime: 30_000,
  });

  const isCatalogMedicineInactive = (medicineId?: string) =>
    Boolean(
      medicineId &&
        medicineStatusQuery.data?.get(medicineId.trim()) === false,
    );

  const renderInactiveMedicineBadge = (medicineId?: string) =>
    isCatalogMedicineInactive(medicineId) ? (
      <Badge variant="secondary" className="ml-2 rounded-full text-[10px]">
        Inactive
      </Badge>
    ) : null;

  const renderMedicationPrice = (medication: AiNotesMedication) => {
    const displayPrice = getEditableMedicationPrice(medication);
    if (displayPrice === undefined) return null;

    const isSaved = getSavedMedicationPrice(medication) !== undefined;
    const label = isSaved
      ? "Price at prescription"
      : isUnsavedCatalogMedicationPrice(medication)
        ? "Current cost"
        : "Price";

    return (
      <p className="text-xs font-medium text-teal-700 md:col-span-6">
        {label}: {formatPrescriptionPrice(displayPrice)}
      </p>
    );
  };

  const handleSave = async () => {
    if (!canEditPrescription) {
      toast.info("Prescription editing is not available.");
      return;
    }

    const validation = validatePrescriptionMedications(content.medications);
    if (!validation.valid) {
      if (validation.medicationIndex !== undefined) {
        setMedicationValidation({
          index: validation.medicationIndex,
          message: validation.message,
        });
      }
      toast.error(validation.message);
      return;
    }

    setMedicationValidation(null);
    try {
      setIsSaving(true);
      if (onSave) {
        const savedNotes = (await onSave(content)) as AiNotes | undefined;
        if (savedNotes?.medications) {
          const nextSession = { ...session, aiNotes: savedNotes };
          setContent(buildAiNotesExportContent(savedNotes, nextSession));
          onNotesUpdated?.(savedNotes);
        }
      }
      setIsEditing(false);
      toast.success("Changes saved successfully.");
    } catch (error: unknown) {
      const apiMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      // useAiNotes.saveExportContent already toasts API errors.
      if (!apiMessage) {
        toast.error("Unable to save changes. Please try again.");
      }
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
    setMedicationValidation(null);
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
    if (!autoManualEdit || hasAutoManualEditRun.current || !canEditPrescription) {
      return;
    }
    hasAutoManualEditRun.current = true;
    setIsEditing(true);
  }, [autoManualEdit, canEditPrescription]);

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
    setIsVoiceEditOpen(false);
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

  useEffect(() => {
    onVoiceFlowActiveChange?.(isVoiceEditOpen || isVoiceReviewOpen);
  }, [isVoiceEditOpen, isVoiceReviewOpen, onVoiceFlowActiveChange]);

  useEffect(() => {
    return () => onVoiceFlowActiveChange?.(false);
  }, [onVoiceFlowActiveChange]);

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
        isConsultationCompleted={isCompleted}
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
          {canEditPrescription ? (
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
          ) : null}
          {canVoiceEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50"
              onClick={handleOpenVoiceEdit}
            >
              <Mic className="mr-2 h-4 w-4" />
              Voice Edit
            </Button>
          ) : null}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Label className="text-base font-semibold tracking-wide">
            MEDICATIONS
          </Label>
          {canEditPrescription ? (
            <MedicationConditionSearch
              organizationId={organizationId}
              excludedMedicineIds={excludedMedicineIds}
              onAdd={addMedicineFromCatalog}
            />
          ) : null}
        </div>

        {content.medications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/40 px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">
              No medications added.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Search a condition or symptom to find medicines configured by your
              organization.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="hidden gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-6">
              <span className="md:col-span-2">Medicine</span>
              <span>Morning</span>
              <span>Afternoon</span>
              <span>Night</span>
              <span>Days</span>
            </div>
            {content.medications.map((medication, index) => (
              <div
                key={`medication-${index}-${medication.medicineId || medication.medicine}`}
                className={cn(
                  "grid gap-2 rounded-lg border bg-white p-3 md:grid-cols-6",
                  medicationValidation?.index === index
                    ? "border-red-300"
                    : "border-teal-100",
                )}
              >
                <Input
                  placeholder="Medicine"
                  value={medication.medicine}
                  onChange={(event) =>
                    updateMedication(index, "medicine", event.target.value)
                  }
                  className="md:col-span-2"
                />
                {renderInactiveMedicineBadge(medication.medicineId)}
                {renderMedicationPrice(medication)}
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
                  disabled={!canEditPrescription}
                >
                  Remove
                </Button>
                {medicationValidation?.index === index ? (
                  <p className="text-xs text-red-600 md:col-span-6">
                    {medicationValidation.message}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {canEditPrescription ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={addMedication}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Medicine (manual)
          </Button>
        ) : null}
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
          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-4 px-4 py-8 sm:px-8 sm:py-10">
            {isEditing ? (
              <div className="w-full max-w-4xl">{editForm}</div>
            ) : (
              <>
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

                <div className="w-full max-w-4xl rounded-xl border border-teal-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold tracking-wide text-foreground">
                        MEDICATIONS
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {canEditPrescription
                          ? "Search your organization formulary by condition or symptom, then save changes."
                          : "Prescription medications for this consultation."}
                      </p>
                    </div>
                    {canEditPrescription ? (
                      <MedicationConditionSearch
                        organizationId={organizationId}
                        excludedMedicineIds={excludedMedicineIds}
                        onAdd={addMedicineFromCatalog}
                      />
                    ) : null}
                  </div>
                  {content.medications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No medications added. Search a condition or symptom to find
                      medicines configured by your organization.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-sm text-foreground">
                      {content.medications.map((medication, index) => (
                        <li key={`view-med-${index}`}>
                          {getMedicationDisplayName(medication)}
                          {renderInactiveMedicineBadge(medication.medicineId)}
                          {medication.days ? ` · ${medication.days} days` : ""}
                          {getEditableMedicationPrice(medication) !==
                          undefined ? (
                            <span className="ml-2 text-teal-700">
                              {formatEditableMedicationPrice(medication)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
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
          {canEditPrescription ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Manual Edit
            </Button>
          ) : null}
          {canVoiceEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenVoiceEdit}
            >
              <Mic className="mr-2 h-4 w-4" />
              Voice Edit
            </Button>
          ) : null}
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
