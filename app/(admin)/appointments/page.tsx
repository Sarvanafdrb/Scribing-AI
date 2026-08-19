"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppointmentTable } from "./components/AppointmentTable";
import { useAppointments } from "@/hooks/appointments/useAppointments";
import { useAppointmentMutations } from "@/hooks/appointments/useAppointmentMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useTenantScope } from "@/hooks/useTenantScope";
import { getAppointmentId } from "@/types/appointment.types";

type ScheduleView = "upcoming" | "range";

const PAGE_SIZE = 10;

export default function AppointmentsPage() {
  const {
    canViewAppointments,
    canCreateAppointment,
    canEditAppointment,
  } = useAccessControl();
  const [view, setView] = useState<ScheduleView>("upcoming");
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const { cancelAppointment } = useAppointmentMutations();
  const { organizationId, organizationName, isAllOrganizations } = useTenantScope();

  const { appointments, total, totalPages, isLoading, isError, error, refetch } =
    useAppointments({
      organizationId: organizationId || undefined,
      page,
      limit: PAGE_SIZE,
      upcoming: view === "upcoming",
      dateFrom: view === "range" ? dateFrom || undefined : undefined,
      dateTo: view === "range" ? dateTo || undefined : undefined,
      enabled: canViewAppointments(),
    });

  useEffect(() => {
    setPage(1);
  }, [view, dateFrom, dateTo]);

  const handleCancel = async (appointment: { id?: string; _id?: string }) => {
    const id = getAppointmentId(
      appointment as Parameters<typeof getAppointmentId>[0],
    );
    if (!window.confirm("Cancel this appointment?")) return;
    setActionId(id);
    try {
      await cancelAppointment.mutateAsync({ id });
    } finally {
      setActionId(null);
    }
  };

  if (!canViewAppointments()) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view appointments.
        </p>
      </div>
    );
  }

  if (!organizationId || isAllOrganizations) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">
            Future visits for one organization at a time.
          </p>
        </div>
        <div className="glass rounded-3xl border border-dashed border-border/70 p-10 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Select an organization from the workspace switcher (top header) to
            view and manage its appointments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="max-w-xl text-muted-foreground">
            Book future visits here. For today&apos;s walk-in or immediate
            consultation, use{" "}
            <Link href="/sessions/create" className="text-primary hover:underline">
              New Consultation
            </Link>{" "}
            — those patients appear directly in the Doctor Workspace.
          </p>
        </div>
        {canCreateAppointment() ? (
          <Link href="/appointments/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
          </Link>
        ) : null}
      </div>

      {organizationName ? (
        <p className="text-sm text-muted-foreground">
          Showing appointments for{" "}
          <span className="font-medium text-foreground">{organizationName}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["upcoming", "Upcoming"],
            ["range", "Date range"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={view === key ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setView(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {view === "range" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              From
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-auto"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              To
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading appointments…
        </div>
      ) : isError ? (
        <div className="glass rounded-3xl border border-destructive/30 p-8 text-center">
          <p className="text-sm text-destructive">
            {(error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Failed to load appointments."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 rounded-full"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <AppointmentTable
          appointments={appointments}
          canCheckIn={false}
          canCancel={canEditAppointment()}
          onCancel={handleCancel}
          cancelLoadingId={actionId}
        />
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      {!isLoading && appointments.length === 0 ? (
        <div className="glass rounded-3xl border border-dashed border-border/70 p-10 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {view === "upcoming"
              ? "No future appointments booked."
              : "No appointments in this date range."}
          </p>
        </div>
      ) : null}

      {!isLoading && view === "upcoming" ? (
        <p className="text-center text-xs text-muted-foreground">
          {total} upcoming appointment{total === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}
