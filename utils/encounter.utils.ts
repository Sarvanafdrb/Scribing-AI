import type {
  Encounter,
  EncounterType,
  RoundType,
} from "@/types/encounter.types";
import type { Session, VisitType } from "@/types/session.types";

export const getEncounterType = (
  session?: Session | null,
): EncounterType => {
  if (session?.encounter?.encounterType) return session.encounter.encounterType;
  if (session?.visitType === "inpatient") return "IP";
  return "OP";
};

export const getVisitType = (session?: Session | null): VisitType =>
  getEncounterType(session) === "IP" ? "inpatient" : "outpatient";

export const getAdmissionDay = (session?: Session | null): number => {
  if (session?.admissionDay && session.admissionDay > 0) {
    return session.admissionDay;
  }
  if (session?.encounter?.admissionDay) return session.encounter.admissionDay;
  const admittedAt =
    session?.encounter?.admission?.admittedAt || session?.admittedDate;
  if (!admittedAt) return 1;
  const start = new Date(admittedAt);
  if (Number.isNaN(start.getTime())) return 1;
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(
    1,
    Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );
};

export const getWard = (session?: Session | null) =>
  session?.ward || session?.encounter?.admission?.ward || "";

export const getBed = (session?: Session | null) =>
  session?.bed || session?.encounter?.admission?.bed || "";

export const getAttendingDoctorName = (session?: Session | null) => {
  const doctor = session?.encounter?.admission?.attendingDoctor;
  if (!doctor) return "";
  return `Dr. ${doctor.firstName || ""} ${doctor.lastName || ""}`.trim();
};

export const getRecordingSectionTitle = (session?: Session | null) => {
  if (getEncounterType(session) === "OP") return "Consultation Recording";
  return session?.roundLabel || "Doctor Round";
};

export const formatEncounterBadge = (session?: Session | null) => {
  if (getEncounterType(session) === "OP") {
    return { kind: "OP" as const, label: "OP Consultation" };
  }
  const day = getAdmissionDay(session);
  const ward = getWard(session) || "—";
  const bed = getBed(session) || "—";
  return {
    kind: "IP" as const,
    label: `IP • Day ${day} • Ward ${ward} • Bed ${bed}`,
  };
};

export const formatRoundTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatAdmissionDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const isIpEncounter = (encounter?: Encounter | null, session?: Session | null) =>
  encounter?.encounterType === "IP" || getEncounterType(session) === "IP";

export const nextSuggestedRoundType = (): RoundType => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "night";
};

/** Next same-day round after the current one (null after night). */
export const nextSameDayRoundType = (
  current?: RoundType | string | null,
): RoundType | null => {
  if (current === "morning") return "afternoon";
  if (current === "afternoon") return "night";
  if (current === "night") return null;
  return "afternoon";
};

export const canStartNextRoundToday = (session?: Session | null): boolean => {
  if (getEncounterType(session) !== "IP") return false;
  if (session?.allRoundsCompletedToday) return false;
  if (typeof session?.hasNextRoundToday === "boolean") {
    return session.hasNextRoundToday;
  }
  const schedule = session?.todaySchedule || [];
  return schedule.some((r) => r.status === "pending");
};
