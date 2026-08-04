"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { History, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { useSession } from "@/hooks/sessions/useSession";
import {
  getQueueItemKey,
  useDoctorQueue,
} from "@/hooks/doctor/useDoctorQueue";
import { useConsultationNavigationGuard } from "@/hooks/doctor/useConsultationNavigationGuard";
import { RecordingSwitchDialog } from "@/components/doctor/RecordingSwitchDialog";
import { getPatientFullName } from "@/utils/patient.utils";
import { getUserOrganizationName } from "@/types/auth.types";
import { sessionKeys } from "@/services/session.queries";
import { encounterService } from "@/services/encounter.service";
import type { DoctorQueueItem } from "@/types/encounter.types";
import type { Session, SessionStatus } from "@/types/session.types";
import { cn } from "@/lib/utils";
import { useActiveRecordingStore } from "@/store/active-recording.store";

const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-violet-500/20 text-violet-300",
  "bg-sky-500/20 text-sky-300",
  "bg-amber-500/20 text-amber-300",
  "bg-rose-500/20 text-rose-300",
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

const QUEUE_STATUS_STYLES: Partial<
  Record<SessionStatus, { label: string; className: string }>
> = {
  recording: {
    label: "Recording",
    className: "bg-red-50 text-red-700",
  },
  paused: {
    label: "Paused",
    className: "bg-amber-50 text-amber-800",
  },
  interrupted: {
    label: "Interrupted",
    className: "bg-yellow-50 text-yellow-800",
  },
  resumed: {
    label: "Resumed",
    className: "bg-emerald-50 text-emerald-800",
  },
  uploading: {
    label: "Uploading",
    className: "bg-blue-50 text-blue-700",
  },
  processing: {
    label: "Processing",
    className: "bg-amber-50 text-amber-700",
  },
  transcript_ready: {
    label: "Transcript Ready",
    className: "bg-indigo-50 text-indigo-700",
  },
  ai_notes_generated: {
    label: "AI Notes Generated",
    className: "bg-violet-50 text-violet-700",
  },
  ready_for_review: {
    label: "Ready for Review",
    className: "bg-teal-50 text-teal-700",
  },
  completed: {
    label: "Completed",
    className: "bg-green-50 text-green-700",
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700",
  },
  created: {
    label: "WAIT",
    className: "bg-amber-50 text-amber-700",
  },
};

interface DoctorSidebarProps {
  activeSessionId: string;
}

export function DoctorSidebar({ activeSessionId }: DoctorSidebarProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: activeSession } = useSession(activeSessionId);
  const { items } = useDoctorQueue();
  const [openingKey, setOpeningKey] = useState<string | null>(null);
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
            Today — {items.length} patient
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
                      <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
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
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
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
              No consultations scheduled for today.
            </p>
          )}
        </div>

        <div className="border-t border-border/50 px-3 py-4">
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
                {user?.qualification || user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <RecordingSwitchDialog
        open={isDialogOpen}
        isSwitching={isSwitching}
        onContinue={continueCurrentConsultation}
        onStopAndSwitch={stopRecordingAndSwitch}
      />
    </>
  );
}
