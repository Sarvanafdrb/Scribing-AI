import type { AiNotesExportContent } from "@/utils/ai-notes-export.utils";
import type { Prescription } from "@/types/prescription.types";

export interface PrescriptionPreviewPayload {
  content: AiNotesExportContent;
  investigations?: string;
  nextReview?: string;
  recordingSeconds?: number;
  billingPrescription?: Prescription;
}
