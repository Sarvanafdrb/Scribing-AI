"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreatePatientDialog } from "@/components/doctor/CreatePatientDialog";
import {
  getQueueItemKey,
  useDoctorQueue,
} from "@/hooks/doctor/useDoctorQueue";
import { useAppointments } from "@/hooks/appointments/useAppointments";
import { useAppointmentMutations } from "@/hooks/appointments/useAppointmentMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useTenantScope } from "@/hooks/useTenantScope";
import { encounterService } from "@/services/encounter.service";
import { sessionKeys } from "@/services/session.queries";
import {
  getPatientAge,
  getPatientFullName,
} from "@/utils/patient.utils";
import { QUEUE_STATUS_STYLES } from "@/utils/doctor-queue.utils";
import {
  getConsultationPreVisitHref,
  getConsultationPreVisitPatientHref,
  getDoctorWorkspaceHref,
} from "@/lib/doctor-consultation-navigation";
import type { DoctorQueueItem } from "@/types/encounter.types";
import type { Session, SessionStatus } from "@/types/session.types";
import type { Appointment } from "@/types/appointment.types";
import { getAppointmentId } from "@/types/appointment.types";
import type { Patient } from "@/types/patient.types";
import { cn } from "@/lib/utils";
import { useActiveRecordingStore } from "@/store/active-recording.store";

const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
];

const SEEN_STATUSES = new Set([
  "completed",
  "transcript_ready",
  "ai_notes_generated",
  "ready_for_review",
]);

const getInitials = (firstName?: string, lastName?: string) => {
  const first = firstName?.charAt(0) || "";
  const last = lastName?.charAt(0) || "";
  return (first + last).toUpperCase() || "?";
};

const formatSessionTime = (session?: Session | null) => {
  const value = session?.startedAt || session?.createdAt;
  if (!value) return "â€”";
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCompactDuration = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  if (total < 60) return `${total} s`;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (secs === 0) return `${mins} m`;
  return `${mins} m ${secs} s`;
};

const getQueueReason = (item: DoctorQueueItem) => {
  const session = item.session;
  const subjective = session?.aiNotes?.subjective?.trim();
  if (subjective) return subjective.split("\n")[0]?.trim() || "Consultation";
  if (session?.title?.trim()) return session.title.trim();
  if (item.encounterType === "IP") {
    return `Inpatient Â· Day ${item.admissionDay || 1}`;
  }
  return "Consultation";
};

const isBriefReady = (item: DoctorQueueItem) => {
  const session = item.session;
  return Boolean(
    session?.previousHistory?.length ||
      session?.aiNotes?.summary?.trim() ||
      session?.aiNotes?.subjective?.trim() ||
      item.patient?.medications?.length,
  );
};

const getPatientMeta = (patient: Patient | null | undefined) => {
  if (!patient) return "";
  const parts: string[] = [];
  const age = getPatientAge(patient);
  if (age !== null) parts.push(`${age} y`);
  if (patient.gender && patient.gender !== "unknown") {
    parts.push(
      patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1),
    );
  }
  return parts.join(" Â· ");
};

export function DoctorConsultationsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { organizationName } = useTenantScope();
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
    limit: 50,
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

  const clinicDateLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  const stats = useMemo(() => {
    const scheduledCount = items.length + scheduledToday.length;
    const seenCount = items.filter((item) =>
      SEEN_STATUSES.has(item.session?.status || ""),
    ).length;
    const notesAwaitingReview = items.filter(
      (item) => item.session?.status === "ready_for_review",
    ).length;
    const totalDuration = items.reduce(
      (sum, item) =>
        sum +
        (item.session?.totalDuration || item.session?.duration || 0),
      0,
    );
    return {
      scheduledCount,
      seenCount,
      notesAwaitingReview,
      timeSavedLabel: formatCompactDuration(Math.round(totalDuration * 0.15)),
    };
  }, [items, scheduledToday.length]);

  const navigateToWorkspace = (sessionId: string) => {
    if (!sessionId) return;
    router.push(getDoctorWorkspaceHref(sessionId));
  };

  const navigateToBrief = (sessionId: string) => {
    if (!sessionId) return;
    router.push(getConsultationPreVisitHref(sessionId));
  };

  const navigateToPatientBrief = (
    patient: Patient | null | undefined,
    appointment?: Appointment,
  ) => {
    const patientId = String(patient?._id || patient?.id || "");
    if (!patientId) return;
    const aptId = appointment ? getAppointmentId(appointment) : undefined;
    const reason = appointment?.reason?.trim();
    router.push(
      getConsultationPreVisitPatientHref(patientId, {
        appointmentId: aptId,
        reason,
      }),
    );
  };

  const openBrief = async (item: DoctorQueueItem) => {
    const key = getQueueItemKey(item);

    if (item.sessionId) {
      navigateToBrief(item.sessionId);
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
          navigateToBrief(nextId);
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(
          err?.response?.data?.message || "Failed to open today's round",
        );
      } finally {
        setOpeningKey(null);
      }
      return;
    }

    navigateToPatientBrief(item.patient);
  };

  const openWorkspace = async (item: DoctorQueueItem) => {
    const key = getQueueItemKey(item);

    if (item.sessionId) {
      navigateToWorkspace(item.sessionId);
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
          navigateToWorkspace(nextId);
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

  const handleCheckIn = async (appointment: Appointment) => {
    const id = getAppointmentId(appointment);
    setCheckingInId(id);
    try {
      const result = await checkInAppointment.mutateAsync(id);
      const sessionId = String(result.session?.id || result.session?._id || "");
      if (sessionId) {
        navigateToWorkspace(sessionId);
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
  const opCount = items.filter((i) => i.encounterType !== "IP").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Today&apos;s clinic
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {clinicDateLabel}
            {organizationName ? ` Â· ${organizationName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {canCreatePatient() ? (
            <Button size="sm" onClick={() => setIsCreatePatientOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add patient
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Scheduled today" value={String(stats.scheduledCount)} />
        <StatCard
          label="Seen"
          value={String(stats.seenCount)}
          subtext={
            stats.seenCount > 0 ? "Completed or reviewed today" : undefined
          }
        />
        <StatCard
          label="Notes awaiting review"
          value={String(stats.notesAwaitingReview)}
          valueClass={
            stats.notesAwaitingReview > 0 ? "text-amber-600" : undefined
          }
        />
        <StatCard
          label="Time saved today"
          value={stats.timeSavedLabel}
          valueClass="text-primary"
        />
      </div>

      {!hasQueue ? (
        <div className="glass rounded-3xl p-10 text-center">
          <h3 className="text-lg font-semibold text-foreground">
            No consultations scheduled today
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Check in a patient or add a walk-in to start recording.
          </p>
          {canCreatePatient() ? (
            <Button className="mt-4" onClick={() => setIsCreatePatientOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add patient
            </Button>
          ) : null}
        </div>
      ) : (
        <section className="glass overflow-hidden rounded-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">Appointment queue</h3>
              <Badge variant="secondary" className="rounded-full">
                OPD {opCount || items.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Every patient has a pre-visit brief ready
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/40 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3 sm:px-6">Time</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Prepared</th>
                  <th className="px-4 py-3 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <QueueTableRow
                    key={getQueueItemKey(item)}
                    item={item}
                    index={index}
                    isOpening={openingKey === getQueueItemKey(item)}
                    onOpen={() => void openBrief(item)}
                    onRecord={() => void openWorkspace(item)}
                  />
                ))}
                {scheduledToday.map((appointment, index) => {
                  const patient = getAppointmentPatient(appointment);
                  const aptId = getAppointmentId(appointment);
                  const isCheckingIn = checkingInId === aptId;
                  const start = new Date(appointment.scheduledStart);

                  return (
                    <tr
                      key={aptId}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (isCheckingIn) return;
                        navigateToPatientBrief(patient, appointment);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          if (!isCheckingIn) {
                            navigateToPatientBrief(patient, appointment);
                          }
                        }
                      }}
                      className="cursor-pointer border-b border-border/30 transition-colors hover:bg-muted/30 focus-visible:bg-muted/40 focus-visible:outline-none"
                    >
                      <td className="px-4 py-4 sm:px-6">
                        <span className="font-medium text-foreground">
                          {start.toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 text-left">
                          <Avatar
                            patient={patient}
                            index={items.length + index}
                          />
                          <div>
                            <p className="font-semibold text-foreground">
                              {patient ? getPatientFullName(patient) : "Patient"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getPatientMeta(patient)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[200px] px-4 py-4">
                        <span className="block truncate text-muted-foreground">
                          {appointment.reason || "Scheduled visit"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="rounded-full text-xs">
                          Awaiting check-in
                        </Badge>
                      </td>
                      <td className="px-4 py-4 sm:px-6 text-right">
                        {canCheckInAppointment() ? (
                          <Button
                            size="sm"
                            className="rounded-full"
                            disabled={isCheckingIn}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleCheckIn(appointment);
                            }}
                          >
                            {isCheckingIn ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                                Record
                              </>
                            )}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
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

function StatCard({
  label,
  value,
  subtext,
  valueClass,
}: {
  label: string;
  value: string;
  subtext?: string;
  valueClass?: string;
}) {
  return (
    <div className="glass rounded-2xl px-4 py-4 sm:px-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold tracking-tight", valueClass)}>
        {value}
      </p>
      {subtext ? (
        <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
      ) : null}
    </div>
  );
}

function Avatar({
  patient,
  index,
}: {
  patient: Patient | null | undefined;
  index: number;
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        AVATAR_COLORS[index % AVATAR_COLORS.length],
      )}
    >
      {getInitials(patient?.firstName, patient?.lastName)}
    </div>
  );
}

function QueueTableRow({
  item,
  index,
  isOpening,
  onOpen,
  onRecord,
}: {
  item: DoctorQueueItem;
  index: number;
  isOpening: boolean;
  onOpen: () => void;
  onRecord: () => void;
}) {
  const patient = item.patient;
  const sessionStatus = (item.session?.status || item.status) as
    | SessionStatus
    | undefined;
  const statusStyle = sessionStatus
    ? QUEUE_STATUS_STYLES[sessionStatus]
    : undefined;
  const allergies = patient?.allergies?.filter(Boolean) || [];
  const briefReady = isBriefReady(item);
  const liveSessionId = useActiveRecordingStore((state) => state.sessionId);
  const isLocallyRecording = useActiveRecordingStore(
    (state) => state.isLocallyRecording,
  );
  const isLive =
    Boolean(item.sessionId) &&
    liveSessionId === item.sessionId &&
    isLocallyRecording;

  const handleRowClick = () => {
    if (isOpening) return;
    onOpen();
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleRowClick();
        }
      }}
      className="cursor-pointer border-b border-border/30 transition-colors hover:bg-muted/30 focus-visible:bg-muted/40 focus-visible:outline-none"
    >
      <td className="px-4 py-4 sm:px-6">
        <span className="font-medium text-foreground">
          {formatSessionTime(item.session)}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3 text-left">
          <Avatar patient={patient} index={index} />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {getPatientFullName(patient)}
            </p>
            <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {getPatientMeta(patient)}
              {allergies.length > 0 ? (
                <>
                  <span>Â·</span>
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  <span>{allergies.slice(0, 2).join(", ")}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </td>
      <td className="max-w-[220px] px-4 py-4">
        <span className="block truncate text-muted-foreground">
          {getQueueReason(item)}
        </span>
      </td>
      <td className="px-4 py-4">
        {briefReady ? (
          <Badge className="gap-1 rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-3 w-3" />
            Brief ready
          </Badge>
        ) : statusStyle ? (
          <Badge
            variant="outline"
            className={cn("rounded-full", statusStyle.className)}
          >
            {statusStyle.label}
          </Badge>
        ) : (
          <span className="text-muted-foreground">â€”</span>
        )}
      </td>
      <td className="px-4 py-4 sm:px-6 text-right">
        {isOpening ? (
          <Loader2 className="ml-auto h-5 w-5 animate-spin text-primary" />
        ) : (
          <Button
            size="sm"
            className={cn(
              "rounded-full",
              isLive
                ? "bg-amber-500 text-white hover:bg-amber-500/90"
                : undefined,
            )}
            onClick={(event) => {
              event.stopPropagation();
              onRecord();
            }}
          >
            <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
            {isLive ? "Resume" : "Record"}
          </Button>
        )}
      </td>
    </tr>
  );
}

function getAppointmentPatient(appointment: Appointment) {
  if (appointment.patientId && typeof appointment.patientId === "object") {
    return appointment.patientId;
  }
  return null;
}
