"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkCell } from "@/components/shared/LinkCell";
import type { Appointment } from "@/types/appointment.types";
import {
  formatAppointmentStatus,
  formatAppointmentType,
  getAppointmentId,
} from "@/types/appointment.types";
import { getPatientFullName } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
};

const formatTimeRange = (start?: string, end?: string) => {
  if (!start) return "—";
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const datePart = startDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = startDate.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = endDate
    ? endDate.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return endTime
    ? `${datePart} · ${startTime} – ${endTime}`
    : `${datePart} · ${startTime}`;
};

const getPatient = (appointment: Appointment): Patient | null => {
  if (appointment.patientId && typeof appointment.patientId === "object") {
    return appointment.patientId;
  }
  return null;
};

const getDoctorName = (appointment: Appointment) => {
  const doctor =
    typeof appointment.doctorId === "object" ? appointment.doctorId : null;
  if (!doctor) return "—";
  return (
    `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() ||
    doctor.email ||
    "—"
  );
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "default",
  checked_in: "secondary",
  in_progress: "secondary",
  completed: "outline",
  cancelled: "destructive",
  no_show: "destructive",
  rescheduled: "outline",
};

interface AppointmentTableProps {
  appointments: Appointment[];
  showDoctor?: boolean;
  onCheckIn?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onAppointmentSelect?: (appointment: Appointment) => void;
  checkInLoadingId?: string | null;
  cancelLoadingId?: string | null;
  canCheckIn?: boolean;
  canCancel?: boolean;
}

export function AppointmentTable({
  appointments,
  showDoctor = true,
  onCheckIn,
  onCancel,
  onAppointmentSelect,
  checkInLoadingId,
  cancelLoadingId,
  canCheckIn = false,
  canCancel = false,
}: AppointmentTableProps) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
        No appointments found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            {showDoctor ? <TableHead>Doctor</TableHead> : null}
            <TableHead>When</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => {
            const id = getAppointmentId(appointment);
            const patient = getPatient(appointment);
            const isScheduledToday =
              appointment.status === "scheduled" ||
              appointment.status === "checked_in";

            return (
              <TableRow
                key={id}
                className={onAppointmentSelect ? "cursor-pointer" : undefined}
                onClick={
                  onAppointmentSelect
                    ? () => onAppointmentSelect(appointment)
                    : undefined
                }
              >
                <TableCell>
                  <div>
                    {onAppointmentSelect ? (
                      <span className="font-medium text-primary">
                        {patient
                          ? getPatientFullName(patient)
                          : appointment.appointmentCode || id.slice(0, 8)}
                      </span>
                    ) : (
                      <LinkCell href={`/appointments/${id}`}>
                        {patient
                          ? getPatientFullName(patient)
                          : appointment.appointmentCode || id.slice(0, 8)}
                      </LinkCell>
                    )}
                    {appointment.reason ? (
                      <p className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground">
                        {appointment.reason}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                {showDoctor ? (
                  <TableCell className="text-sm">{getDoctorName(appointment)}</TableCell>
                ) : null}
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatTimeRange(
                    appointment.scheduledStart,
                    appointment.scheduledEnd,
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {formatAppointmentType(appointment.appointmentType)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS_VARIANT[appointment.status] || "secondary"}
                    className="font-normal capitalize"
                  >
                    {formatAppointmentStatus(appointment.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div
                    className="flex justify-end gap-1"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button asChild variant="ghost" size="sm" className="rounded-full">
                      <Link href={`/appointments/${id}`}>View</Link>
                    </Button>
                    {canCheckIn &&
                    isScheduledToday &&
                    appointment.status === "scheduled" &&
                    onCheckIn ? (
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-full bg-blue-600 hover:bg-blue-700"
                        disabled={checkInLoadingId === id}
                        onClick={() => onCheckIn(appointment)}
                      >
                        {checkInLoadingId === id ? "Starting…" : "Check-in"}
                      </Button>
                    ) : null}
                    {canCancel &&
                    appointment.status === "scheduled" &&
                    onCancel ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={cancelLoadingId === id}
                        onClick={() => onCancel(appointment)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export { formatDateTime, formatTimeRange, getDoctorName, getPatient };
