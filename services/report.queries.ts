import type { UsagePeriod } from "@/types/report.types";

export const reportKeys = {
  all: ["super-admin-reports"] as const,
  totalDoctors: () => [...reportKeys.all, "total-doctors"] as const,
  averageTranscriptionTime: () =>
    [...reportKeys.all, "average-transcription-time"] as const,
  averageAiNoteTime: () =>
    [...reportKeys.all, "average-ai-note-time"] as const,
  usage: (period: UsagePeriod) =>
    [...reportKeys.all, "usage", period] as const,
  topOrganizations: () => [...reportKeys.all, "top-organizations"] as const,
  transcriptionStatus: () =>
    [...reportKeys.all, "transcription-status"] as const,
};
