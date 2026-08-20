"use client";

import { useState } from "react";
import { CalendarDays, Clock3, Loader2, Users } from "lucide-react";
import { DoctorShell } from "@/components/doctor/DoctorShell";
import { DoctorDateRangePicker } from "@/components/doctor/dashboard/DoctorDateRangePicker";
import {
  DoctorDashboardView,
  type StatCardConfig,
} from "@/components/doctor/dashboard/DoctorDashboardView";
import { useDoctorDashboardStats } from "@/hooks/doctor/useDoctorDashboardStats";
import { getDefaultDoctorDateRange } from "@/lib/doctor-dashboard-date-range";

const STAT_CARDS: StatCardConfig[] = [
  {
    key: "totalPatients",
    title: "Total Patients",
    description: "Active patients in your organization",
    icon: Users,
    iconClass: "bg-indigo-500",
    chartColor: "#6366f1",
    chartType: "area",
    dataKey: "weekTrend",
  },
  {
    key: "todayPatients",
    title: "Today's Patients",
    description: "Distinct patients consulted today",
    icon: Clock3,
    iconClass: "bg-slate-800 dark:bg-slate-700",
    chartColor: "#3b82f6",
    chartType: "bar",
    dataKey: "todayByHour",
  },
  {
    key: "weekPatients",
    title: "This Week's Patients",
    description: "Monday–Sunday (local week)",
    icon: CalendarDays,
    iconClass: "bg-violet-500",
    chartColor: "#8b5cf6",
    chartType: "bar",
    dataKey: "weekByDay",
  },
  {
    key: "monthPatients",
    title: "This Month's Patients",
    description: "Calendar month to date",
    icon: CalendarDays,
    iconClass: "bg-pink-500",
    chartColor: "#ec4899",
    chartType: "line",
    dataKey: "monthTrend",
  },
];

const EMPTY_CHARTS = {
  weekTrend: [],
  todayByHour: [],
  weekByDay: [],
  monthTrend: [],
};

export default function DoctorDashboardPage() {
  const [dateRange, setDateRange] = useState(getDefaultDoctorDateRange);
  const { data: stats, isLoading, isError, error } =
    useDoctorDashboardStats(dateRange);

  return (
    <DoctorShell
      title="Dashboard"
      description="Overview of your patient activity and schedule."
      actions={
        <DoctorDateRangePicker value={dateRange} onChange={setDateRange} />
      }
    >
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
          {(error as Error)?.message || "Failed to load dashboard metrics."}
        </div>
      ) : (
        <DoctorDashboardView
          stats={{
            totalPatients: stats?.totalPatients ?? 0,
            todayPatients: stats?.todayPatients ?? 0,
            weekPatients: stats?.weekPatients ?? 0,
            monthPatients: stats?.monthPatients ?? 0,
            scheduledSurgery: stats?.scheduledSurgery ?? null,
            surgeryAvailable: stats?.surgeryAvailable ?? false,
            boundaries: stats?.boundaries ?? {
              todayStart: "",
              weekStart: "",
              monthStart: "",
              weekEnd: "",
            },
            charts: stats?.charts ?? EMPTY_CHARTS,
          }}
          cards={STAT_CARDS}
        />
      )}
    </DoctorShell>
  );
}
