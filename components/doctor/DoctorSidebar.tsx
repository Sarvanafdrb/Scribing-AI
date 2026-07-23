"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { History, UserRound } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useSession } from "@/hooks/sessions/useSession";
import { useDoctorQueue } from "@/hooks/doctor/useDoctorQueue";
import { useConsultationNavigationGuard } from "@/hooks/doctor/useConsultationNavigationGuard";
import { RecordingSwitchDialog } from "@/components/doctor/RecordingSwitchDialog";
import { getPatientFullName } from "@/utils/patient.utils";
import { getUserOrganizationName } from "@/types/auth.types";
import { sessionKeys } from "@/services/session.queries";
import type { Session, SessionStatus } from "@/types/session.types";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-teal-100 text-teal-700",
  "bg-blue-100 text-blue-700",
  "bg-gray-100 text-gray-700",
  "bg-teal-50 text-teal-600",
  "bg-blue-50 text-blue-600",
];

const getInitials = (firstName?: string, lastName?: string) => {
  const first = firstName?.charAt(0) || "";
  const last = lastName?.charAt(0) || "";
  return (first + last).toUpperCase() || "?";
};

const formatQueueTime = (session: Session) => {
  const dateStr = session.startedAt || session.createdAt;
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const QUEUE_STATUS_STYLES: Partial<
  Record<SessionStatus, { label: string; className: string }>
> = {
  recording: {
    label: "Recording",
    className: "bg-red-50 text-red-700",
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
  const { sessions, getSessionId, getPatientFromSession } = useDoctorQueue();
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

  // Keep the patient list in sync with the active session's latest status.
  useEffect(() => {
    if (!activeSession?.status) return;

    queryClient.setQueriesData(
      { queryKey: sessionKeys.lists() },
      (current: unknown) => {
        if (!current || typeof current !== "object") return current;
        const data = current as { sessions?: Session[] };
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

  return (
    <>
      <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-5">
          <div className="flex items-center gap-3">
            {organizationLogo ? (
              <img
                src={organizationLogo}
                alt={`${organizationName} logo`}
                className="h-9 w-9 shrink-0 rounded-lg object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-teal-600">
                {organizationName}
              </h1>
              <p className="text-xs text-gray-500">AI Medical Scribe</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-3 px-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Today — {sessions.length} patient
            {sessions.length !== 1 ? "s" : ""}
          </p>

          <nav className="space-y-1">
            {sessions.map((session, index) => {
              const sessionId = getSessionId(session);
              const patient = getPatientFromSession(session);
              const isActive = sessionId === activeSessionId;
              const statusStyle = QUEUE_STATUS_STYLES[session.status];
              const showStatusBadge =
                Boolean(statusStyle) &&
                (session.status !== "created" || !isActive);

              return (
                <button
                  key={sessionId}
                  type="button"
                  onClick={() => requestNavigateToSession(sessionId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-teal-50 ring-1 ring-teal-100"
                      : "hover:bg-gray-50",
                  )}
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
                      <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        isActive ? "text-teal-800" : "text-gray-800",
                      )}
                    >
                      {getPatientFullName(patient)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatQueueTime(session)}
                    </p>
                  </div>

                  {showStatusBadge && statusStyle && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                        statusStyle.className,
                      )}
                    >
                      {statusStyle.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {sessions.length === 0 && (
            <p className="px-2 text-sm text-gray-500">
              No consultations scheduled for today.
            </p>
          )}
        </div>

        <div className="border-t border-gray-200 px-3 py-4">
          <button
            type="button"
            onClick={() => requestNavigateToHref("/sessions")}
            className="mb-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800"
          >
            <History className="h-4 w-4" />
            Consultation History
          </button>

          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">
                {doctorName}
              </p>
              <p className="truncate text-xs text-gray-500">
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
