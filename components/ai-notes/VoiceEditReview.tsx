"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, Loader2, Mic, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { aiNotesService } from "@/services/ai-notes.service";
import type {
  AiNotes,
  VoiceEditPreviewResult,
} from "@/types/ai-notes.types";
import {
  assertVoiceEditMedicationsAllowedForCompletedSession,
} from "@/utils/prescriptionMedication.utils";

interface VoiceEditReviewProps {
  open: boolean;
  sessionId: string;
  preview: VoiceEditPreviewResult | null;
  isConsultationCompleted?: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted: (aiNotes: AiNotes) => void;
  onContinueVoiceEdit: () => void;
}

export function VoiceEditReview({
  open,
  sessionId,
  preview,
  isConsultationCompleted = false,
  onOpenChange,
  onAccepted,
  onContinueVoiceEdit,
}: VoiceEditReviewProps) {
  const [isAccepting, setIsAccepting] = useState(false);

  if (!preview) return null;

  const medicationGuard = isConsultationCompleted
    ? assertVoiceEditMedicationsAllowedForCompletedSession(
        preview.currentNotes.medications,
        preview.proposedNotes.medications,
      )
    : { allowed: true as const };

  const handleAccept = async () => {
    if (isConsultationCompleted && !medicationGuard.allowed) {
      toast.error(medicationGuard.message);
      return;
    }

    try {
      setIsAccepting(true);
      const result = await aiNotesService.acceptVoiceEdit(sessionId, {
        proposedNotes: {
          summary: preview.proposedNotes.summary,
          subjective: preview.proposedNotes.subjective,
          objective: preview.proposedNotes.objective,
          assessment: preview.proposedNotes.assessment,
          plan: preview.proposedNotes.plan,
          remarks: preview.proposedNotes.remarks,
          medications: isConsultationCompleted
            ? preview.currentNotes.medications
            : preview.proposedNotes.medications,
        },
        instructionText: preview.instructionText,
        changedSections: preview.changedSections,
        changeSummary: preview.changeSummary,
        vitalsUpdates: preview.vitalsUpdates,
      });

      toast.success(`Voice edits saved (version ${result.version}).`);
      onAccepted(result.aiNotes);
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (error as { message?: string })?.message ||
        "Failed to apply voice edits.";
      toast.error(message);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = () => {
    onOpenChange(false);
    toast.info("Voice edits discarded.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        data-voice-review=""
        overlayClassName="z-[70]"
        className="z-[80] flex max-h-[90vh] w-[min(96vw,820px)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0"
        onPointerDownOutside={(event) => {
          if (isAccepting) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (isAccepting) event.preventDefault();
        }}
      >
        <DialogHeader className="border-b border-gray-100 px-6 py-4">
          <DialogTitle>Changes Detected</DialogTitle>
          <DialogDescription>
            Review the proposed voice edits before saving. Only listed sections
            will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-900">
            <p className="font-medium">Instruction</p>
            <p className="mt-1 text-teal-800/90">{preview.instructionText}</p>
            {preview.changeSummary ? (
              <p className="mt-2 text-xs text-teal-700">{preview.changeSummary}</p>
            ) : null}
          </div>

          {!medicationGuard.allowed ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {medicationGuard.message} Accept is disabled because this voice
              edit would modify prescription medications on a completed
              consultation.
            </div>
          ) : null}

          {preview.changes.map((change) => (
            <section
              key={change.section}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {change.label}
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-red-50/70 p-3">
                  <p className="text-[11px] font-semibold tracking-wide text-red-600 uppercase">
                    Before
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                    {change.before}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50/70 p-3">
                  <p className="text-[11px] font-semibold tracking-wide text-green-700 uppercase">
                    After
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                    {change.after}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={handleReject}
            disabled={isAccepting}
          >
            <X className="mr-2 h-4 w-4" />
            Reject Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50"
            onClick={() => {
              onOpenChange(false);
              onContinueVoiceEdit();
            }}
            disabled={isAccepting}
          >
            <Mic className="mr-2 h-4 w-4" />
            Continue Voice Editing
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-teal-600 hover:bg-teal-700"
            onClick={handleAccept}
            disabled={
              isAccepting ||
              (isConsultationCompleted && !medicationGuard.allowed)
            }
          >
            {isAccepting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Accept Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
