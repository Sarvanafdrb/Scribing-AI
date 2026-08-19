"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { DoctorShell } from "@/components/doctor/DoctorShell";
import { AppointmentTable } from "@/app/(admin)/appointments/components/AppointmentTable";
import { useAppointments } from "@/hooks/appointments/useAppointments";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useAuthStore } from "@/store/auth.store";
import { useTenantScope } from "@/hooks/useTenantScope";
import type { Appointment } from "@/types/appointment.types";
import { getPatientFullName } from "@/utils/patient.utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ScheduleView = "today" | "upcoming" | "week";

const PAGE_SIZE = 10;

function getLocalWeekRangeIso() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = dayStart.getDay();
  const mondayOffset = (dayOfWeek + 6) % 7;
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { dateFrom: fmt(weekStart), dateTo: fmt(weekEnd) };
}

function describeAppointmentClick(appointment: Appointment) {
  const start = new Date(appointment.scheduledStart);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const aptDay = new Date(start);
  aptDay.setHours(0, 0, 0, 0);

  const patient =
    appointment.patientId && typeof appointment.patientId === "object"
      ? appointment.patientId
      : null;
  const name = patient ? getPatientFullName(patient) : "Patient";
  const dateLabel = start.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeLabel = start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (aptDay.getTime() > todayStart.getTime()) {
    toast.info(
      `${name} is scheduled for ${dateLabel} at ${timeLabel}. Consultation opens on that day after Check-in.`,
      { duration: 6000 },
    );
    return;
  }

  if (aptDay.getTime() < todayStart.getTime()) {
    toast.info(`${name} — past appointment on ${dateLabel} at ${timeLabel}.`);
    return;
  }

  toast.info(
    `${name} is scheduled today at ${timeLabel}. Use Today's Consultations to check in and start the visit.`,
    { duration: 6000 },
  );
}

export default function DoctorSchedulePage() {
  const { canViewAppointments } = useAccessControl();
  const user = useAuthStore((state) => state.user);
  const { organizationId } = useTenantScope();
  const doctorId = String(user?.id || user?._id || "");

  const [view, setView] = useState<ScheduleView>("today");
  const [page, setPage] = useState(1);
  const weekRange = getLocalWeekRangeIso();

  useEffect(() => {
    setPage(1);
  }, [view]);

  const {
    appointments,
    total,
    totalPages,
    isLoading,
    isError,
    error,
    refetch,
  } = useAppointments({
    doctorId,
    organizationId: organizationId || undefined,
    today: view === "today",
    upcoming: view === "upcoming",
    dateFrom: view === "week" ? weekRange.dateFrom : undefined,
    dateTo: view === "week" ? weekRange.dateTo : undefined,
    page,
    limit: PAGE_SIZE,
    enabled:
      canViewAppointments() && Boolean(doctorId) && Boolean(organizationId),
  });

  if (!canViewAppointments()) {
    return (
      <DoctorShell title="Schedule">
        <div className="glass rounded-3xl p-8 text-center text-muted-foreground">
          You do not have permission to view appointments.
        </div>
      </DoctorShell>
    );
  }

  return (
    <DoctorShell
      title="Schedule"
      description="Your appointments — future visits are view-only until check-in day."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: "today", label: "Today" },
            { id: "week", label: "This Week" },
            { id: "upcoming", label: "Upcoming" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              view === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
          {(error as Error)?.message || "Failed to load schedule."}
          <Button className="mt-4" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <AppointmentTable
            appointments={appointments}
            showDoctor={false}
            onAppointmentSelect={describeAppointmentClick}
          />
          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {total} appointments
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </DoctorShell>
  );
}
