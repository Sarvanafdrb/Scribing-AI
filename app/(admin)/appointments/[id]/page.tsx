"use client";

import { useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppointment } from "@/hooks/appointments/useAppointments";
import { useAppointmentMutations } from "@/hooks/appointments/useAppointmentMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import {
  formatAppointmentStatus,
  formatAppointmentType,
  getAppointmentId,
} from "@/types/appointment.types";
import {
  formatTimeRange,
  getDoctorName,
  getPatient,
} from "../components/AppointmentTable";
import { CancelAppointmentDialog } from "../components/CancelAppointmentDialog";
import { RescheduleAppointmentPanel } from "../components/RescheduleAppointmentPanel";
import { getPatientFullName } from "@/utils/patient.utils";
import { appointmentService } from "@/services/appointment.service";
import type { Appointment } from "@/types/appointment.types";

const subscribeToMinuteClock = (onStoreChange: () => void) => {
  const id = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(id);
};

const getMinuteClockSnapshot = () => Date.now();

const refId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as { id?: string; _id?: string };
    return String(obj.id || obj._id || "");
  }
  return String(value);
};

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const appointmentId = Array.isArray(rawId) ? rawId[0] : rawId || "";
  const { data: appointment, isLoading, error } = useAppointment(appointmentId);
  const { data: auditMeta } = useQuery({
    queryKey: ["appointment-audit", appointmentId],
    queryFn: () => appointmentService.getAudit(appointmentId),
    enabled: Boolean(appointmentId),
  });
  const {
    canViewAppointments,
    canEditAppointment,
    canCheckInAppointment,
    canCreateAppointment,
  } = useAccessControl();
  const { cancelAppointment, checkInAppointment } = useAppointmentMutations();

  const [showReschedule, setShowReschedule] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const nowMs = useSyncExternalStore(
    subscribeToMinuteClock,
    getMinuteClockSnapshot,
    getMinuteClockSnapshot,
  );

  if (!canViewAppointments()) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold">Access Denied</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading appointment…
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold">Appointment not found</h1>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/appointments">Back to Schedule</Link>
        </Button>
      </div>
    );
  }

  const id = getAppointmentId(appointment);
  const patient = getPatient(appointment);
  const patientName = patient ? getPatientFullName(patient) : undefined;
  const canReschedule =
    canCreateAppointment() &&
    !["cancelled", "completed", "rescheduled", "in_progress"].includes(
      appointment.status,
    );
  const canCancel =
    canEditAppointment() &&
    !["cancelled", "completed", "rescheduled", "in_progress"].includes(
      appointment.status,
    );
  const organizationId = refId(
    (appointment as Appointment).organizationId,
  );
  const doctorId = refId((appointment as Appointment).doctorId);
  const durationMinutes = Math.max(
    5,
    Math.round(
      (new Date(appointment.scheduledEnd).getTime() -
        new Date(appointment.scheduledStart).getTime()) /
        60_000,
    ) || 30,
  );
  const scheduledStartMs = new Date(appointment.scheduledStart).getTime();
  const isPastStart = scheduledStartMs < nowMs;
  const canCheckIn =
    canCheckInAppointment() &&
    ["scheduled", "confirmed"].includes(appointment.status) &&
    !isPastStart;

  const handleCheckIn = async () => {
    setPending(true);
    try {
      const result = await checkInAppointment.mutateAsync(id);
      const sessionId = String(result.session?.id || result.session?._id || "");
      if (sessionId) {
        router.push(`/doctor/workspace/${sessionId}`);
      }
    } finally {
      setPending(false);
    }
  };

  const handleConfirmCancel = async (cancellationReason: string) => {
    setPending(true);
    try {
      await cancelAppointment.mutateAsync({
        id,
        data: { cancellationReason },
      });
      setCancelDialogOpen(false);
    } finally {
      setPending(false);
    }
  };

  const sessionId =
    typeof appointment.sessionId === "object" && appointment.sessionId
      ? String(appointment.sessionId.id || appointment.sessionId._id || "")
      : typeof appointment.sessionId === "string"
        ? appointment.sessionId
        : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/appointments">
        <Button variant="ghost" className="rounded-xl pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Schedule
        </Button>
      </Link>

      <Card className="glass mt-6 rounded-3xl">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>
                {patient ? getPatientFullName(patient) : "Appointment"}
              </CardTitle>
              <CardDescription>
                {appointment.appointmentCode || id} ·{" "}
                {formatTimeRange(
                  appointment.scheduledStart,
                  appointment.scheduledEnd,
                )}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="capitalize">
              {formatAppointmentStatus(appointment.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Doctor</p>
              <p className="font-medium">{getDoctorName(appointment)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">
                {formatAppointmentType(appointment.appointmentType)}
              </p>
            </div>
            {appointment.reason ? (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Reason</p>
                <p className="font-medium">{appointment.reason}</p>
              </div>
            ) : null}
            {appointment.notes ? (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p className="font-medium">{appointment.notes}</p>
              </div>
            ) : null}
            {appointment.status === "cancelled" &&
            appointment.cancellationReason ? (
              <div className="sm:col-span-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-muted-foreground">Cancellation reason</p>
                <p className="mt-1 font-medium text-foreground">
                  {appointment.cancellationReason}
                </p>
                {appointment.cancelledByName ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Cancelled by:{" "}
                    <span className="font-medium text-foreground">
                      {appointment.cancelledByName}
                    </span>
                  </p>
                ) : null}
                {appointment.cancelledAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cancelled{" "}
                    {new Date(appointment.cancelledAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}
            {auditMeta?.rescheduleCount !== undefined ? (
              <div className="sm:col-span-2 text-sm text-muted-foreground">
                Reschedules in chain: {auditMeta.rescheduleCount}
                {auditMeta.requiresApprovalForNextReschedule
                  ? " · Additional approval required for next reschedule"
                  : null}
              </div>
            ) : null}
            {isPastStart &&
            ["scheduled", "confirmed", "no_show"].includes(appointment.status) ? (
              <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                This appointment date has passed. Please reschedule to continue.
              </div>
            ) : null}
          </div>

          {sessionId ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href={`/sessions/${sessionId}`}>View consultation</Link>
            </Button>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
            {canCheckIn ? (
              <Button
                type="button"
                className="rounded-full bg-blue-600 hover:bg-blue-700"
                disabled={pending}
                onClick={handleCheckIn}
              >
                Check-in & Start
              </Button>
            ) : null}
            {canReschedule ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={pending}
                onClick={() => setShowReschedule((v) => !v)}
              >
                Reschedule
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                type="button"
                variant="destructive"
                className="rounded-full"
                disabled={pending}
                onClick={() => setCancelDialogOpen(true)}
              >
                Cancel
              </Button>
            ) : null}
          </div>

          {showReschedule && canReschedule && organizationId && doctorId ? (
            <RescheduleAppointmentPanel
              key={id}
              appointmentId={id}
              organizationId={organizationId}
              initialDoctorId={doctorId}
              defaultDurationMinutes={durationMinutes}
              auditMeta={auditMeta}
              onRescheduled={(newId) => router.push(`/appointments/${newId}`)}
            />
          ) : null}

          {auditMeta?.events?.length ? (
            <div className="space-y-2 border-t border-border/50 pt-4">
              <p className="font-medium">Appointment history</p>
              <ul className="space-y-2 text-sm">
                {auditMeta.events.map((event: {
                  id?: string;
                  eventType?: string;
                  createdAt?: string;
                  reason?: string;
                }) => (
                  <li
                    key={event.id || event.createdAt}
                    className="rounded-xl border border-border/50 px-3 py-2"
                  >
                    <p className="font-medium">{event.eventType}</p>
                    {event.reason ? (
                      <p className="text-muted-foreground">{event.reason}</p>
                    ) : null}
                    {event.createdAt ? (
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CancelAppointmentDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleConfirmCancel}
        pending={pending}
        patientName={patientName}
      />
    </div>
  );
}
