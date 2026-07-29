"use client";

import { useState } from "react";
import { Clock, FileText, Stethoscope } from "lucide-react";
import { useAccessControl } from "@/hooks/useAccessControl";
import {
  useAverageAiNoteTimeReport,
  useAverageTranscriptionTimeReport,
  useTopOrganizationsReport,
  useTotalDoctorsReport,
  useTranscriptionStatusReport,
  useUsageReport,
} from "@/hooks/reports/useReports";
import { ReportStatCard } from "@/components/reports/ReportStatCard";
import { UsageChartCard } from "@/components/reports/UsageChartCard";
import { TranscriptionStatusChart } from "@/components/reports/TranscriptionStatusChart";
import { TopOrganizationsTable } from "@/components/reports/TopOrganizationsTable";
import type { UsagePeriod } from "@/types/report.types";

function formatSeconds(seconds?: number) {
  if (seconds == null || Number.isNaN(seconds)) return "0 sec";
  return `${Math.round(seconds)} sec`;
}

export default function ReportsPage() {
  const { isSuperAdmin } = useAccessControl();
  const [period, setPeriod] = useState<UsagePeriod>("weekly");

  const totalDoctorsQuery = useTotalDoctorsReport(isSuperAdmin);
  const transcriptionTimeQuery =
    useAverageTranscriptionTimeReport(isSuperAdmin);
  const aiNoteTimeQuery = useAverageAiNoteTimeReport(isSuperAdmin);
  const usageQuery = useUsageReport(period, isSuperAdmin);
  const topOrgsQuery = useTopOrganizationsReport(isSuperAdmin);
  const transcriptionStatusQuery = useTranscriptionStatusReport(isSuperAdmin);

  if (!isSuperAdmin) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="rounded-lg border border-red-100 bg-red-50 px-6 py-4 text-center">
          <h1 className="text-lg font-semibold text-red-700">Access Denied</h1>
          <p className="mt-1 text-sm text-red-600">
            Super Admin access is required to view platform reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-blue-100">
          Platform-wide analytics across organizations, doctors, and
          consultations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReportStatCard
          title="Total Doctors"
          value={String(totalDoctorsQuery.data?.totalDoctors ?? 0)}
          icon={Stethoscope}
          isLoading={totalDoctorsQuery.isLoading}
          accentClassName="bg-blue-600"
        />
        <ReportStatCard
          title="Average Transcription Time"
          value={formatSeconds(transcriptionTimeQuery.data?.averageSeconds)}
          icon={Clock}
          isLoading={transcriptionTimeQuery.isLoading}
          empty={
            !transcriptionTimeQuery.isLoading &&
            !transcriptionTimeQuery.data?.averageSeconds
          }
          accentClassName="bg-teal-600"
        />
        <ReportStatCard
          title="Average AI Note Generation Time"
          value={formatSeconds(aiNoteTimeQuery.data?.averageSeconds)}
          icon={FileText}
          isLoading={aiNoteTimeQuery.isLoading}
          empty={
            !aiNoteTimeQuery.isLoading &&
            !aiNoteTimeQuery.data?.averageSeconds
          }
          accentClassName="bg-indigo-600"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <UsageChartCard
            period={period}
            onPeriodChange={setPeriod}
            data={usageQuery.data}
            isLoading={usageQuery.isLoading}
          />
        </div>
        <div className="xl:col-span-2">
          <TranscriptionStatusChart
            data={transcriptionStatusQuery.data}
            isLoading={transcriptionStatusQuery.isLoading}
          />
        </div>
      </div>

      <TopOrganizationsTable
        data={topOrgsQuery.data}
        isLoading={topOrgsQuery.isLoading}
      />
    </div>
  );
}
