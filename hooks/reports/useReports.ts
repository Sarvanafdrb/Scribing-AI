import { useQuery } from "@tanstack/react-query";
import { reportService } from "@/services/report.service";
import { reportKeys } from "@/services/report.queries";
import type { UsagePeriod } from "@/types/report.types";

export const useTotalDoctorsReport = (enabled = true) =>
  useQuery({
    queryKey: reportKeys.totalDoctors(),
    queryFn: reportService.getTotalDoctors,
    enabled,
    staleTime: 60 * 1000,
  });

export const useAverageTranscriptionTimeReport = (enabled = true) =>
  useQuery({
    queryKey: reportKeys.averageTranscriptionTime(),
    queryFn: reportService.getAverageTranscriptionTime,
    enabled,
    staleTime: 60 * 1000,
  });

export const useAverageAiNoteTimeReport = (enabled = true) =>
  useQuery({
    queryKey: reportKeys.averageAiNoteTime(),
    queryFn: reportService.getAverageAiNoteTime,
    enabled,
    staleTime: 60 * 1000,
  });

export const useUsageReport = (period: UsagePeriod, enabled = true) =>
  useQuery({
    queryKey: reportKeys.usage(period),
    queryFn: () => reportService.getUsage(period),
    enabled,
    staleTime: 60 * 1000,
  });

export const useTopOrganizationsReport = (enabled = true) =>
  useQuery({
    queryKey: reportKeys.topOrganizations(),
    queryFn: reportService.getTopOrganizations,
    enabled,
    staleTime: 60 * 1000,
  });

export const useTranscriptionStatusReport = (enabled = true) =>
  useQuery({
    queryKey: reportKeys.transcriptionStatus(),
    queryFn: reportService.getTranscriptionStatus,
    enabled,
    staleTime: 60 * 1000,
  });
