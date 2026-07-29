import type { UsagePeriod } from "@/types/report.types";

export const reportKeys = {
  all: ["super-admin-reports"] as const,
  totalDoctors: (organizationId = "all") =>
    [...reportKeys.all, "total-doctors", organizationId] as const,
  averageTranscriptionTime: (organizationId = "all") =>
    [...reportKeys.all, "average-transcription-time", organizationId] as const,
  averageAiNoteTime: (organizationId = "all") =>
    [...reportKeys.all, "average-ai-note-time", organizationId] as const,
  usage: (period: UsagePeriod, organizationId = "all") =>
    [...reportKeys.all, "usage", period, organizationId] as const,
  topOrganizations: (organizationId = "all") =>
    [...reportKeys.all, "top-organizations", organizationId] as const,
  transcriptionStatus: (organizationId = "all") =>
    [...reportKeys.all, "transcription-status", organizationId] as const,
};
