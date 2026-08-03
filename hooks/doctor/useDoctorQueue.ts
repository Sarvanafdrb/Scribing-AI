import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useTenantScope } from "@/hooks/useTenantScope";
import { encounterService } from "@/services/encounter.service";
import { sessionKeys } from "@/services/session.queries";
import type { DoctorQueueItem } from "@/types/encounter.types";
import type { Session } from "@/types/session.types";
import type { Patient } from "@/types/patient.types";
import { isPipelineActive } from "@/utils/session-status.utils";

export const getSessionId = (session: Session) =>
  String(session._id || session.id || "");

export const getQueueItemKey = (item: DoctorQueueItem) =>
  item.sessionId ||
  item.encounterId ||
  `${item.encounterType}-${item.patient?._id || item.patient?.id || "unknown"}`;

const getLocalDayKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getPatientFromQueueItem = (
  item: DoctorQueueItem,
): Patient | null => item.patient || null;

/** @deprecated Prefer queue items; kept for session-based callers. */
export const getPatientFromSession = (session: Session): Patient | null => {
  if (typeof session.patientId === "object" && session.patientId) {
    return session.patientId as Patient;
  }
  return null;
};

export const useDoctorQueue = () => {
  const user = useAuthStore((state) => state.user);
  const authHydrated = useAuthStore((state) => state._hasHydrated);
  const workspaceHydrated = useWorkspaceStore((state) => state._hasHydrated);
  const selectedWorkspace = useWorkspaceStore((state) => state.selectedWorkspace);
  const { organizationId } = useTenantScope();

  const doctorId = String(user?.id || user?._id || "");
  const scopedOrganizationId = organizationId || selectedWorkspace?.id || "";
  const todayKey = getLocalDayKey();

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
      todayKey,
    ],
    queryFn: async () => {
      const data = await encounterService.getDoctorQueue({
        organizationId: scopedOrganizationId,
        doctorId,
      });
      return data;
    },
    enabled: isScopeReady,
    staleTime: 5 * 1000,
    retry: 1,
    refetchInterval: (queryResult) => {
      const items = queryResult.state.data?.items || [];
      const hasActivePipeline = items.some((item) =>
        item.session ? isPipelineActive(item.session.status) : false,
      );
      return hasActivePipeline ? 2000 : false;
    },
  });

  const items = query.data?.items || [];

  // Compatibility: flatten to sessions when a sessionId exists
  const sessions: Session[] = items
    .filter((item) => item.sessionId)
    .map((item) => {
      if (item.session && typeof item.session === "object") {
        return {
          ...item.session,
          _id: item.sessionId || undefined,
          patientId: item.patient || item.session.patientId,
          visitType: item.encounterType === "IP" ? "inpatient" : "outpatient",
          ward: item.ward || undefined,
          bed: item.bed || undefined,
          admissionDay: item.admissionDay || undefined,
          encounter: item.encounter || undefined,
        } as Session;
      }
      return {
        _id: item.sessionId || undefined,
        patientId: item.patient || "",
        status: (item.status as Session["status"]) || "created",
        visitType: item.encounterType === "IP" ? "inpatient" : "outpatient",
        ward: item.ward || undefined,
        bed: item.bed || undefined,
        admissionDay: item.admissionDay || undefined,
        encounter: item.encounter || undefined,
        title: "",
        sessionCode: "",
        organizationId: scopedOrganizationId,
        userId: doctorId,
        sessionType: "consultation",
      } as Session;
    });

  return {
    ...query,
    doctorId,
    organizationId: scopedOrganizationId,
    isScopeReady,
    items,
    sessions,
    allSessions: sessions,
    getSessionId,
    getQueueItemKey,
    getPatientFromSession,
    getPatientFromQueueItem,
  };
};
