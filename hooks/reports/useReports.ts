import { useQuery } from "@tanstack/react-query";
import { reportService } from "@/services/report.service";
import { reportKeys } from "@/services/report.queries";
import { useTenantScope } from "@/hooks/useTenantScope";
import type { UsagePeriod } from "@/types/report.types";

const useReportScopeKey = () => {
  const { organizationId } = useTenantScope();
  return organizationId || "all";
};

export const useTotalDoctorsReport = (enabled = true) => {
  const organizationId = useReportScopeKey();

  return useQuery({
    queryKey: reportKeys.totalDoctors(organizationId),
    queryFn: reportService.getTotalDoctors,
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useAverageTranscriptionTimeReport = (enabled = true) => {
  const organizationId = useReportScopeKey();

  return useQuery({
    queryKey: reportKeys.averageTranscriptionTime(organizationId),
    queryFn: reportService.getAverageTranscriptionTime,
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useAverageAiNoteTimeReport = (enabled = true) => {
  const organizationId = useReportScopeKey();

  return useQuery({
    queryKey: reportKeys.averageAiNoteTime(organizationId),
    queryFn: reportService.getAverageAiNoteTime,
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useUsageReport = (period: UsagePeriod, enabled = true) => {
  const organizationId = useReportScopeKey();

  return useQuery({
    queryKey: reportKeys.usage(period, organizationId),
    queryFn: () => reportService.getUsage(period),
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useTopOrganizationsReport = (enabled = true) => {
  const organizationId = useReportScopeKey();

  return useQuery({
    queryKey: reportKeys.topOrganizations(organizationId),
    queryFn: reportService.getTopOrganizations,
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useTranscriptionStatusReport = (enabled = true) => {
  const organizationId = useReportScopeKey();

  return useQuery({
    queryKey: reportKeys.transcriptionStatus(organizationId),
    queryFn: reportService.getTranscriptionStatus,
    enabled,
    staleTime: 60 * 1000,
  });
};
