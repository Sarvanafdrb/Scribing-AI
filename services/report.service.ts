import { api } from "@/services/api";
import type {
  AverageTimeReport,
  TopOrganizationReport,
  TotalDoctorsReport,
  TranscriptionStatusReport,
  UsagePeriod,
  UsageReport,
} from "@/types/report.types";

export const reportService = {
  getTotalDoctors: async (): Promise<TotalDoctorsReport> => {
    const response = await api.get("/super-admin/reports/total-doctors");
    return response.data.data;
  },

  getAverageTranscriptionTime: async (): Promise<AverageTimeReport> => {
    const response = await api.get(
      "/super-admin/reports/average-transcription-time",
    );
    return response.data.data;
  },

  getAverageAiNoteTime: async (): Promise<AverageTimeReport> => {
    const response = await api.get("/super-admin/reports/average-ai-note-time");
    return response.data.data;
  },

  getUsage: async (period: UsagePeriod): Promise<UsageReport> => {
    const response = await api.get("/super-admin/reports/usage", {
      params: { period },
    });
    return response.data.data;
  },

  getTopOrganizations: async (): Promise<TopOrganizationReport[]> => {
    const response = await api.get("/super-admin/reports/top-organizations");
    return response.data.data;
  },

  getTranscriptionStatus: async (): Promise<TranscriptionStatusReport> => {
    const response = await api.get("/super-admin/reports/transcription-status");
    return response.data.data;
  },
};
