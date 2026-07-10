import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useTenantScope } from "@/hooks/useTenantScope";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import type { Session } from "@/types/session.types";
import type { Patient } from "@/types/patient.types";

export const getSessionId = (session: Session) =>
  String(session._id || session.id || "");

export const getSessionDoctorId = (session: Session): string => {
  if (typeof session.userId === "object" && session.userId) {
    return String(session.userId._id || session.userId.id || "");
  }
  return String(session.userId || "");
};

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const getPatientFromSession = (session: Session): Patient | null => {
  if (typeof session.patientId === "object" && session.patientId) {
    return session.patientId as Patient;
  }
  return null;
};

const filterSessionsForDoctor = (sessions: Session[], doctorId: string) =>
  sessions.filter((session) => getSessionDoctorId(session) === doctorId);

const sortSessionsForQueue = (sessions: Session[]) =>
  [...sessions].sort((a, b) => {
    const aTime = new Date(a.startedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.startedAt || b.createdAt || 0).getTime();
    return aTime - bTime;
  });

export const useDoctorQueue = () => {
  const user = useAuthStore((state) => state.user);
  const authHydrated = useAuthStore((state) => state._hasHydrated);
  const workspaceHydrated = useWorkspaceStore((state) => state._hasHydrated);
  const selectedWorkspace = useWorkspaceStore((state) => state.selectedWorkspace);
  const { organizationId } = useTenantScope();

  const doctorId = String(user?.id || user?._id || "");
  const scopedOrganizationId = organizationId || selectedWorkspace?.id || "";

  const isScopeReady =
    authHydrated &&
    workspaceHydrated &&
    Boolean(doctorId) &&
    Boolean(scopedOrganizationId);

  const query = useQuery({
    queryKey: [
      ...sessionKeys.lists(),
      "doctor-queue",
      doctorId,
      scopedOrganizationId,
    ],
    queryFn: async () => {
      const baseParams = {
        organizationId: scopedOrganizationId,
        isActive: "true",
        limit: 100,
        page: 1,
      };

      const scopedResult = await sessionService.getAll({
        ...baseParams,
        userId: doctorId,
      });

      let sessions = scopedResult.sessions;

      if (sessions.length === 0) {
        const orgResult = await sessionService.getAll(baseParams);
        sessions = filterSessionsForDoctor(orgResult.sessions, doctorId);
      }

      return {
        ...scopedResult,
        sessions: sortSessionsForQueue(sessions),
      };
    },
    enabled: isScopeReady,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const allSessions = query.data?.sessions || [];
  const todaySessions = allSessions.filter(
    (session) =>
      isToday(session.createdAt) ||
      isToday(session.startedAt) ||
      session.status === "recording",
  );

  return {
    ...query,
    doctorId,
    organizationId: scopedOrganizationId,
    isScopeReady,
    sessions: todaySessions.length > 0 ? todaySessions : allSessions,
    allSessions,
    getSessionId,
    getPatientFromSession,
  };
};
