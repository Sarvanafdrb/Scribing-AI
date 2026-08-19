"use client";

import { Loader2, CalendarDays, Users, Scissors, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoctorShell } from "@/components/doctor/DoctorShell";
import { useDoctorDashboardStats } from "@/hooks/doctor/useDoctorDashboardStats";
import { cn } from "@/lib/utils";

const STAT_CARDS = [
  {
    key: "totalPatients",
    title: "Total Patients",
    description: "Active patients in your organization",
    icon: Users,
    color: "bg-indigo-500/80",
  },
  {
    key: "todayPatients",
    title: "Today's Patients",
    description: "Distinct patients consulted today",
    icon: Stethoscope,
    color: "bg-primary/80",
  },
  {
    key: "weekPatients",
    title: "This Week's Patients",
    description: "Monday–Sunday (local week)",
    icon: CalendarDays,
    color: "bg-violet-500/80",
  },
  {
    key: "monthPatients",
    title: "This Month's Patients",
    description: "Calendar month to date",
    icon: CalendarDays,
    color: "bg-fuchsia-500/80",
  },
  {
    key: "scheduledSurgery",
    title: "Scheduled Surgery",
    description: "Requires surgery module",
    icon: Scissors,
    color: "bg-slate-500/80",
  },
] as const;

export default function DoctorDashboardPage() {
  const { data: stats, isLoading, isError, error } = useDoctorDashboardStats();

  return (
    <DoctorShell
      title="Dashboard"
      description="Overview of your patient activity and schedule."
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {STAT_CARDS.map((card) => {
            const Icon = card.icon;
            const value =
              card.key === "scheduledSurgery"
                ? stats?.surgeryAvailable
                  ? String(stats?.scheduledSurgery ?? 0)
                  : "—"
                : String(stats?.[card.key as keyof typeof stats] ?? 0);

            return (
              <Card key={card.key} className="glass border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-white",
                      card.color,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {card.description}
                  </p>
                  {card.key === "scheduledSurgery" && !stats?.surgeryAvailable ? (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Surgery scheduling is not configured yet.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DoctorShell>
  );
}
