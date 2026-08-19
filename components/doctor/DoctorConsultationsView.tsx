"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreatePatientDialog } from "@/components/doctor/CreatePatientDialog";
import {
  getQueueItemKey,
  useDoctorQueue,
} from "@/hooks/doctor/useDoctorQueue";
import { useAppointments } from "@/hooks/appointments/useAppointments";
import { useAppointmentMutations } from "@/hooks/appointments/useAppointmentMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { encounterService } from "@/services/encounter.service";
import { sessionKeys } from "@/services/session.queries";
import { getPatientFullName } from "@/utils/patient.utils";
import { QUEUE_STATUS_STYLES } from "@/utils/doctor-queue.utils";
import type { DoctorQueueItem } from "@/types/encounter.types";
import type { Session, SessionStatus } from "@/types/session.types";
import type { Appointment } from "@/types/appointment.types";
import { getAppointmentId } from "@/types/appointment.types";
import { cn } from "@/lib/utils";
import { useActiveRecordingStore } from "@/store/active-recording.store";

const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-violet-500/20 text-violet-300",
  "bg-purple-500/20 text-purple-300",
  "bg-fuchsia-500/20 text-fuchsia-300",
  "bg-indigo-500/20 text-indigo-300",
];

const getInitials = (firstName?: string, lastName?: string) => {
  const first = firstName?.charAt(0) || "";
  const last = lastName?.charAt(0) || "";
  return (first + last).toUpperCase() || "?";
};

const formatQueueDuration = (
  session: Session | null | undefined,
  liveElapsedBySessionId: {
    sessionId: string | null;
    elapsedSeconds: number;
    isLocallyRecording: boolean;
  },
) => {
  if (!session) return "00:00";

  const sessionId = String(session._id || session.id || "");
  const isLiveLocal =
    liveElapsedBySessionId.isLocallyRecording &&
    liveElapsedBySessionId.sessionId === sessionId;

  if (isLiveLocal) {
    const seconds = Math.max(
      0,
      Math.floor(liveElapsedBySessionId.elapsedSeconds),
    );
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  if (
    session.status === "created" ||
    (!session.audioUrl &&
      !(session.recordingSegments?.length) &&
      session.status !== "recording" &&
      session.status !== "paused" &&
      session.status !== "interrupted" &&
      session.status !== "resumed")
  ) {
    return "00:00";
  }

  const seconds = Math.max(
    0,
    Math.floor(session.totalDuration || session.duration || 0),
  );
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export function DoctorConsultationsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canCreatePatient, canViewAppointments, canCheckInAppointment } =
    useAccessControl();
  const {
    items,
    doctorId,
    organizationId: scopedOrgId,
    isLoading,
    isScopeReady,
    isError,
    error,
    refetch,
  } = useDoctorQueue();
  const { checkInAppointment } = useAppointmentMutations();
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);

  const { appointments: todayAppointments } = useAppointments({
    doctorId,
    organizationId: scopedOrgId,
    today: true,
    limit: 20,
    enabled: canViewAppointments() && Boolean(doctorId) && Boolean(scopedOrgId),
  });

  const scheduledToday = todayAppointments.filter((apt) => {
    if (apt.status !== "scheduled") return false;
    const patient = getAppointmentPatient(apt);
    const patientId = String(patient?._id || patient?.id || "");
    if (!patientId) return true;
    return !items.some((item) => {
      const queuePatientId = String(item.patient?._id || item.patient?.id || "");
      return queuePatientId === patientId;
    });
  });

  const liveSessionId = useActiveRecordingStore((state) => state.sessionId);
  const liveElapsedSeconds = useActiveRecordingStore(
    (state) => state.elapsedSeconds,
  );
  const isLocallyRecording = useActiveRecordingStore(
    (state) => state.isLocallyRecording,
  );
  const liveRecording = {
    sessionId: liveSessionId,
    elapsedSeconds: liveElapsedSeconds,
    isLocallyRecording,
  };

  const navigateToSession = (sessionId: string) => {
    if (!sessionId) return;
    router.push(`/doctor/workspace/${sessionId}`);
  };

  const openQueueItem = async (item: DoctorQueueItem) => {
    const key = getQueueItemKey(item);

    if (item.sessionId) {
      navigateToSession(item.sessionId);
      return;
    }

    if (item.kind === "ip_encounter" && item.encounterId) {
      if (item.allRoundsCompletedToday) {
        toast.info("Today's rounds completed.");
        return;
      }
      try {
        setOpeningKey(key);
        const data = await encounterService.startRoundForEncounter(
          item.encounterId,
          { roundScheduleId: item.nextRoundScheduleId || undefined },
        );
        const nextId = String(data.session?._id || data.session?.id || "");
        await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
        if (nextId) {
          navigateToSession(nextId);
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(
          err?.response?.data?.message || "Failed to open today's round",
        );
      } finally {
        setOpeningKey(null);
      }
    }
  };

  const formatAppointmentTime = (appointment: Appointment) => {
    const start = new Date(appointment.scheduledStart);
    return start.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAppointmentPatient = (appointment: Appointment) => {
    if (
      appointment.patientId &&
      typeof appointment.patientId === "object"
    ) {
      return appointment.patientId;
    }
    return null;
  };

  const handleCheckIn = async (appointment: Appointment) => {
    const id = getAppointmentId(appointment);
    setCheckingInId(id);
    try {
      const result = await checkInAppointment.mutateAsync(id);
      const sessionId = String(result.session?.id || result.session?._id || "");
      if (sessionId) {
        navigateToSession(sessionId);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Failed to check in");
    } finally {
      setCheckingInId(null);
    }
  };

  if (!isScopeReady || isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {(error as Error)?.message || "Failed to load today's consultations."}
        </p>
        <Button className="mt-4" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const hasQueue = items.length > 0 || scheduledToday.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Select a consultation to open the clinical workspace. Future visits
          appear under Schedule.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {canCreatePatient() ? (
            <Button size="sm" onClick={() => setIsCreatePatientOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
          ) : null}
        </div>
      </div>

      {!hasQueue ? (
        <div className="glass rounded-3xl p-10 text-center">
          <h3 className="text-lg font-semibold text-foreground">
            No consultations scheduled today
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Check in a patient from today&apos;s appointments or add a walk-in
            patient to start a consultation.
          </p>
          {canCreatePatient() ? (
            <Button className="mt-4" onClick={() => setIsCreatePatientOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="glass rounded-3xl p-4 sm:p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Today&apos;s Consultations — {items.length}
            </h3>
            <nav className="space-y-2">
              {items.map((item, index) => {
                const key = getQueueItemKey(item);
                const patient = item.patient;
                const sessionStatus = (item.session?.status ||
                  item.status) as SessionStatus | undefined;
                const statusStyle = sessionStatus
                  ? QUEUE_STATUS_STYLES[sessionStatus]
                  : undefined;
                const isOpening = openingKey === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openQueueItem(item)}
                    disabled={isOpening}
                    className="glass-row flex w-full items-center gap-3 px-3 py-3 text-left"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold",
                        AVATAR_COLORS[index % AVATAR_COLORS.length],
                      )}
                    >
                      {getInitials(patient?.firstName, patient?.lastName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {getPatientFullName(patient)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.encounterType === "IP"
                          ? `Day ${item.admissionDay || 1}${item.ward ? ` · ${item.ward}` : ""}`
                          : formatQueueDuration(
                              item.session as Session | null,
                              liveRecording,
                            )}
                      </p>
                    </div>
                    {isOpening ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : statusStyle ? (
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                          statusStyle.className,
                        )}
                      >
                        {statusStyle.label}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </section>

          {canViewAppointments() && scheduledToday.length > 0 ? (
            <section className="glass rounded-3xl p-4 sm:p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Awaiting Check-in — {scheduledToday.length}
              </h3>
              <nav className="space-y-2">
                {scheduledToday.map((appointment, index) => {
                  const patient = getAppointmentPatient(appointment);
                  const aptId = getAppointmentId(appointment);
                  const isCheckingIn = checkingInId === aptId;

                  return (
                    <div
                      key={aptId}
                      className="glass-row flex items-center gap-3 px-3 py-3"
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold",
                          AVATAR_COLORS[index % AVATAR_COLORS.length],
                        )}
                      >
                        {getInitials(patient?.firstName, patient?.lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {patient ? getPatientFullName(patient) : "Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatAppointmentTime(appointment)}
                          {appointment.reason ? ` · ${appointment.reason}` : ""}
                        </p>
                      </div>
                      {canCheckInAppointment() ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isCheckingIn}
                          onClick={() => handleCheckIn(appointment)}
                        >
                          {isCheckingIn ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Check-in"
                          )}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </nav>
            </section>
          ) : null}
        </div>
      )}

      {canCreatePatient() ? (
        <CreatePatientDialog
          open={isCreatePatientOpen}
          onOpenChange={setIsCreatePatientOpen}
          onCreated={() => {
            void queryClient.invalidateQueries({
              predicate: (query) =>
                Array.isArray(query.queryKey) &&
                query.queryKey.includes("doctor-queue"),
            });
          }}
        />
      ) : null}
    </div>
  );
}

function getAppointmentPatient(appointment: Appointment) {
  if (appointment.patientId && typeof appointment.patientId === "object") {
    return appointment.patientId;
  }
  return null;
}
