"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PrescriptionCompletionIssue } from "@/utils/prescriptionMedication.utils";

interface IncompletePrescriptionCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: PrescriptionCompletionIssue[];
  isCompleting?: boolean;
  onReviewPrescription: () => void;
  onCompleteAnyway: () => void;
}

export function IncompletePrescriptionCompletionDialog({
  open,
  onOpenChange,
  issues,
  isCompleting = false,
  onReviewPrescription,
  onCompleteAnyway,
}: IncompletePrescriptionCompletionDialogProps) {
  const uniqueRows = Array.from(
    new Map(
      issues.map((issue) => [
        issue.rowNumber,
        {
          rowNumber: issue.rowNumber,
          label: issue.label,
          messages: issues
            .filter((entry) => entry.rowNumber === issue.rowNumber)
            .map((entry) => entry.message),
        },
      ]),
    ).values(),
  ).sort((left, right) => left.rowNumber - right.rowNumber);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Incomplete prescription
          </DialogTitle>
          <DialogDescription>
            One or more medications in this prescription are incomplete. You can
            review them before completing, or complete the consultation anyway.
            Incomplete medications will remain on the completed record and
            cannot be edited afterward.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">Affected medications</p>
          <ul className="mt-2 space-y-2">
            {uniqueRows.map((row) => (
              <li key={row.rowNumber}>
                <span className="font-medium">
                  Row {row.rowNumber}
                  {row.label && row.label !== `Row ${row.rowNumber}`
                    ? `: ${row.label}`
                    : ""}
                </span>
                <ul className="mt-1 list-disc pl-5 text-amber-900/90 dark:text-amber-100/90">
                  {Array.from(new Set(row.messages)).map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            disabled={isCompleting}
            onClick={onReviewPrescription}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Go Back / Review Prescription
          </button>
          <button
            type="button"
            disabled={isCompleting}
            onClick={onCompleteAnyway}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isCompleting ? "Completing…" : "Complete Anyway"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
