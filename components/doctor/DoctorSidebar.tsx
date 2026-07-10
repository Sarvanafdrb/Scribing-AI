"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, UserRound } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useDoctorQueue } from "@/hooks/doctor/useDoctorQueue";
import { getPatientFullName } from "@/utils/patient.utils";
import type { Session } from "@/types/session.types";
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

interface DoctorSidebarProps {
  activeSessionId: string;
}

export function DoctorSidebar({ activeSessionId }: DoctorSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sessions, getSessionId, getPatientFromSession } = useDoctorQueue();

  const doctorName = user ? `Dr. ${user.firstName} ${user.lastName}` : "Doctor";

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-5">
        <h1 className="text-xl font-bold text-teal-600">Titanium</h1>
        <p className="text-xs text-gray-500">AI Medical Scribe</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-3 px-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          Today — {sessions.length} patient{sessions.length !== 1 ? "s" : ""}
        </p>

        <nav className="space-y-1">
          {sessions.map((session, index) => {
            const sessionId = getSessionId(session);
            const patient = getPatientFromSession(session);
            const isActive =
              sessionId === activeSessionId || pathname.includes(sessionId);
            const isWaiting =
              session.status === "created" && sessionId !== activeSessionId;

            return (
              <Link
                key={sessionId}
                href={`/doctor/workspace/${sessionId}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
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

                {isWaiting && (
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    WAIT
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {sessions.length === 0 && (
          <p className="px-2 text-sm text-gray-500">No sessions today</p>
        )}
      </div>

      <div className="border-t border-gray-200 px-3 py-4">
        <Link
          href="/sessions"
          className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800"
        >
          <History className="h-4 w-4" />
          Consultation History
        </Link>

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
  );
}
