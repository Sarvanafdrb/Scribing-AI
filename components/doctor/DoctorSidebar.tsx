"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { History, Home, Loader2, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useSession } from "@/hooks/sessions/useSession";
import {
  getQueueItemKey,
  useDoctorQueue,
} from "@/hooks/doctor/useDoctorQueue";
import { useAppointments } from "@/hooks/appointments/useAppointments";
import { useAppointmentMutations } from "@/hooks/appointments/useAppointmentMutations";
import { useConsultationNavigationGuard } from "@/hooks/doctor/useConsultationNavigationGuard";
import { RecordingSwitchDialog } from "@/components/doctor/RecordingSwitchDialog";
import { CreatePatientDialog } from "@/components/doctor/CreatePatientDialog";
import { getPatientFullName } from "@/utils/patient.utils";
import { getUserOrganizationName } from "@/types/auth.types";
import { sessionKeys } from "@/services/session.queries";
import { encounterService } from "@/services/encounter.service";
import type { DoctorQueueItem } from "@/types/encounter.types";
import type { Session, SessionStatus } from "@/types/session.types";
import type { Appointment } from "@/types/appointment.types";
import { getAppointmentId } from "@/types/appointment.types";
import { cn } from "@/lib/utils";
import { useActiveRecordingStore } from "@/store/active-recording.store";
import { QUEUE_STATUS_STYLES } from "@/utils/doctor-queue.utils";

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
    const seconds = Math.max(0, Math.floor(liveElapsedBySessionId.elapsedSeconds));
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

interface DoctorSidebarProps {
  activeSessionId: string;
}

export function DoctorSidebar({ activeSessionId }: DoctorSidebarProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { canCreatePatient, canViewAppointments, canCheckInAppointment } =
    useAccessControl();
  const { data: activeSession } = useSession(activeSessionId);
  const { items, doctorId, organizationId: scopedOrgId } = useDoctorQueue();
  const { checkInAppointment } = useAppointmentMutations();
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const { appointments: todayAppointments } = useAppointments({
    doctorId,
    organizationId: scopedOrgId,
    today: true,
    limit: 20,
    enabled: canViewAppointments() && Boolean(doctorId) && Boolean(scopedOrgId),
  });

  const { appointments: upcomingAppointments } = useAppointments({
    doctorId,
    organizationId: scopedOrgId,
    upcoming: true,
    limit: 10,
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
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);
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
  const {
    requestNavigateToSession,
    requestNavigateToHref,
    isDialogOpen,
    isSwitching,
    continueCurrentConsultation,
    stopRecordingAndSwitch,
  } = useConsultationNavigationGuard({
    currentSessionId: activeSessionId,
    currentSessionStatus: activeSession?.status,
  });

  useEffect(() => {
    if (!activeSession?.status) return;

    queryClient.setQueriesData(
      { queryKey: sessionKeys.lists() },
      (current: unknown) => {
        if (!current || typeof current !== "object") return current;
        const data = current as { sessions?: Session[]; items?: DoctorQueueItem[] };
        if (Array.isArray(data.items)) {
          let changed = false;
          const nextItems = data.items.map((item) => {
            if (item.sessionId !== activeSessionId) return item;
            if (item.session?.status === activeSession.status) return item;
            changed = true;
            return {
              ...item,
              status: activeSession.status,
              session: item.session
                ? { ...item.session, status: activeSession.status }
                : item.session,
            };
          });
          return changed ? { ...data, items: nextItems } : current;
        }
        if (!Array.isArray(data.sessions)) return current;

        let changed = false;
        const sessions = data.sessions.map((session) => {
          const id = String(session._id || session.id || "");
          if (id !== activeSessionId) return session;
          if (session.status === activeSession.status) return session;
          changed = true;
          return { ...session, status: activeSession.status };
        });

        return changed ? { ...data, sessions } : current;
      },
    );
  }, [activeSession?.status, activeSessionId, queryClient]);

  const doctorName = user ? `Dr. ${user.firstName} ${user.lastName}` : "Doctor";
  const organizationName = getUserOrganizationName(user) || "Organization";
  const organizationLogo = user?.organization?.logo;

  const openQueueItem = async (item: DoctorQueueItem) => {
    const key = getQueueItemKey(item);

    if (item.sessionId) {
      requestNavigateToSession(item.sessionId);
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
          requestNavigateToSession(nextId);
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
      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.includes("doctor-queue"),
      });
      const sessionId = String(result.session?.id || result.session?._id || "");
      if (sessionId) {
        requestNavigateToSession(sessionId);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Failed to check in");
    } finally {
      setCheckingInId(null);
    }
  };

  const handleFutureAppointmentClick = (appointment: Appointment) => {
    const patient = getAppointmentPatient(appointment);
    const start = new Date(appointment.scheduledStart);
    const dateLabel = start.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const name = patient ? getPatientFullName(patient) : "Patient";
    const reason = appointment.reason?.trim();

    toast.info(
      `${name} is scheduled for ${dateLabel} at ${formatAppointmentTime(appointment)}.${
        reason ? ` Reason: ${reason}.` : ""
      } Consultation opens on that day after Check-in — not before.`,
      { duration: 6000 },
    );
  };

  return (
    <>
      <aside className="glass flex h-full w-[260px] shrink-0 flex-col border-r border-border/50">
        <div className="border-b border-border/50 px-5 py-5">
          <div className="flex items-center gap-3">
            {organizationLogo ? (
              <img
                src={organizationLogo}
                alt={`${organizationName} logo`}
                className="h-9 w-9 shrink-0 rounded-xl object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-primary">
                {organizationName}
              </h1>
              <p className="text-xs text-muted-foreground">AI Medical Scribe</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-3 px-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Today&apos;s Consultations — {items.length} patient
            {items.length !== 1 ? "s" : ""}
          </p>

          <nav className="space-y-1">
            {items.map((item, index) => {
              const key = getQueueItemKey(item);
              const patient = item.patient;
              const sessionId = item.sessionId || "";
              const isActive =
                Boolean(sessionId) && sessionId === activeSessionId;
              const sessionStatus = (item.session?.status ||
                item.status) as SessionStatus | undefined;
              const statusStyle = sessionStatus
                ? QUEUE_STATUS_STYLES[sessionStatus]
                : undefined;
              const showStatusBadge =
                Boolean(statusStyle) &&
                (sessionStatus !== "created" || !isActive);
              const isOpening = openingKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openQueueItem(item)}
                  disabled={isOpening}
                  className={cn(
                    "glass-row flex w-full items-center gap-3 px-3 py-2.5 text-left",
                    isActive && "shadow-glow",
                  )}
                  data-active={isActive ? "true" : undefined}
                >
                  <div className="relative">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold",
                        AVATAR_COLORS[index % AVATAR_COLORS.length],
                      )}
                    >
                      {getInitials(patient?.firstName, patient?.lastName)}
                    </div>
                    {isActive && (
                      <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          isActive ? "text-primary" : "text-foreground",
                        )}
                      >
                        {getPatientFullName(patient)}
                      </p>
                      {item.encounterType === "OP" ? (
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-px text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">
                          OP
                        </span>
                      ) : (
                        <>
                          {item.isEmergency && (
                            <span className="shrink-0 rounded-full bg-red-500/15 px-1.5 py-px text-[9px] font-semibold text-red-700 dark:text-red-300">
                              EM
                            </span>
                          )}
                          <span className="shrink-0 rounded-full bg-sky-500/15 px-1.5 py-px text-[9px] font-semibold text-sky-700 dark:text-sky-300">
                            IP
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.encounterType === "IP" ? (
                        <span className="text-primary/80">
                          Day {item.admissionDay || 1}
                          {item.ward ? ` · ${item.ward}` : ""}
                          {item.nextRoundLabel
                            ? ` · ${item.nextRoundLabel}`
                            : ""}
                        </span>
                      ) : (
                        formatQueueDuration(
                          item.session as Session | null,
                          liveRecording,
                        )
                      )}
                    </p>
                  </div>

                  {isOpening ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    showStatusBadge &&
                    statusStyle && (
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                          statusStyle.className,
                        )}
                      >
                        {statusStyle.label}
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </nav>

          {items.length === 0 && (
            <p className="px-2 text-sm text-gray-500">
              No consultations for today.
            </p>
          )}

          {canViewAppointments() && scheduledToday.length > 0 ? (
            <div className="mt-6">
              <p className="mb-3 px-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Awaiting check-in — {scheduledToday.length}
              </p>
              <nav className="space-y-1">
                {scheduledToday.map((appointment, index) => {
                  const patient = getAppointmentPatient(appointment);
                  const aptId = getAppointmentId(appointment);
                  const isCheckingIn = checkingInId === aptId;

                  return (
                    <div
                      key={aptId}
                      className="glass-row flex w-full items-center gap-3 px-3 py-2.5"
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold",
                          AVATAR_COLORS[index % AVATAR_COLORS.length],
                        )}
                      >
                        {getInitials(patient?.firstName, patient?.lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {patient ? getPatientFullName(patient) : "Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatAppointmentTime(appointment)}
                          {appointment.reason ? ` · ${appointment.reason}` : ""}
                        </p>
                      </div>
                      {canCheckInAppointment() ? (
                        <button
                          type="button"
                          disabled={isCheckingIn}
                          onClick={() => handleCheckIn(appointment)}
                          className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20"
                        >
                          {isCheckingIn ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Check-in"
                          )}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </nav>
            </div>
          ) : null}

          {canViewAppointments() && upcomingAppointments.length > 0 ? (
            <div className="mt-6">
              <p className="mb-1 px-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Future appointments — {upcomingAppointments.length}
              </p>
              <p className="mb-3 px-2 text-[10px] text-muted-foreground/80">
                Tap for details · Check-in on visit day
              </p>
              <nav className="space-y-1">
                {upcomingAppointments.map((appointment, index) => {
                  const patient = getAppointmentPatient(appointment);
                  const aptId = getAppointmentId(appointment);
                  const start = new Date(appointment.scheduledStart);

                  return (
                    <button
                      key={aptId}
                      type="button"
                      onClick={() => handleFutureAppointmentClick(appointment)}
                      className="glass-row flex w-full items-center gap-3 px-3 py-2 text-left opacity-90 transition-opacity hover:opacity-100"
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold",
                          AVATAR_COLORS[(index + 2) % AVATAR_COLORS.length],
                        )}
                      >
                        {getInitials(patient?.firstName, patient?.lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {patient ? getPatientFullName(patient) : "Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {start.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          · {formatAppointmentTime(appointment)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border/50 px-3 py-4">
          {canCreatePatient() ? (
            <button
              type="button"
              onClick={() => setIsCreatePatientOpen(true)}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Patient
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => requestNavigateToHref("/doctor")}
            className="mb-2 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            Doctor Home
          </button>

          <button
            type="button"
            onClick={() => requestNavigateToHref("/sessions")}
            className="mb-3 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <History className="h-4 w-4" />
            Consultation History
          </button>

          <div className="glass-tint flex items-center gap-3 rounded-2xl px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {doctorName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[user?.specialization, user?.qualification]
                  .filter(Boolean)
                  .join(" · ") || user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

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

      <RecordingSwitchDialog
        open={isDialogOpen}
        isSwitching={isSwitching}
        onContinue={continueCurrentConsultation}
        onStopAndSwitch={stopRecordingAndSwitch}
      />
    </>
  );
}
