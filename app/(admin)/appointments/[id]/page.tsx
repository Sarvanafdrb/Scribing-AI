"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { getPatientFullName } from "@/utils/patient.utils";

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const appointmentId = Array.isArray(rawId) ? rawId[0] : rawId || "";
  const { data: appointment, isLoading, error } = useAppointment(appointmentId);
  const {
    canViewAppointments,
    canEditAppointment,
    canCheckInAppointment,
  } = useAccessControl();
  const { cancelAppointment, rescheduleAppointment, checkInAppointment } =
    useAppointmentMutations();

  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("09:00");
  const [rescheduleDuration, setRescheduleDuration] = useState(30);
  const [cancelReason, setCancelReason] = useState("");
  const [pending, setPending] = useState(false);

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
  const canModify =
    canEditAppointment() &&
    !["cancelled", "completed", "rescheduled", "in_progress"].includes(
      appointment.status,
    );
  const canCheckIn =
    canCheckInAppointment() && appointment.status === "scheduled";

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

  const handleCancel = async () => {
    if (!window.confirm("Cancel this appointment?")) return;
    setPending(true);
    try {
      await cancelAppointment.mutateAsync({
        id,
        data: { cancellationReason: cancelReason.trim() || undefined },
      });
      router.push("/appointments");
    } finally {
      setPending(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleStart) return;
    setPending(true);
    try {
      const updated = await rescheduleAppointment.mutateAsync({
        id,
        data: {
          appointmentDate: rescheduleDate,
          startTime: rescheduleStart,
          durationMinutes: rescheduleDuration,
        },
      });
      router.push(`/appointments/${getAppointmentId(updated)}`);
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

      <Card className="glass rounded-3xl">
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
            {canModify ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={pending}
                  onClick={() => setShowReschedule((v) => !v)}
                >
                  Reschedule
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-full"
                  disabled={pending}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </>
            ) : null}
          </div>

          {showReschedule && canModify ? (
            <div className="space-y-3 rounded-2xl border border-border/60 p-4">
              <p className="font-medium">Reschedule appointment</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
                <Input
                  type="time"
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                />
                <Input
                  type="number"
                  min={5}
                  max={480}
                  value={rescheduleDuration}
                  onChange={(e) => setRescheduleDuration(Number(e.target.value))}
                  placeholder="Duration (min)"
                />
              </div>
              <Button
                type="button"
                className="rounded-full bg-blue-600 hover:bg-blue-700"
                disabled={pending || !rescheduleDate}
                onClick={handleReschedule}
              >
                Confirm reschedule
              </Button>
            </div>
          ) : null}

          {canModify ? (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Cancellation reason (optional)
              </label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder="Reason for cancellation"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
