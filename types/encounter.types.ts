export type EncounterType = "OP" | "IP";

export type EncounterStatus =
  | "in_consultation"
  | "follow_up"
  | "admitted"
  | "completed"
  | "discharged"
  | "closed"
  | "active";

export type RoundType =
  | "morning"
  | "afternoon"
  | "night"
  | "custom"
  | "consultation";

export type DispositionType = "home" | "follow_up" | "admit";

export type RoundScheduleStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped"
  | "missed";

export interface EncounterDoctor {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  qualification?: string;
}

export interface AdmissionInfo {
  admittedAt: string;
  ward: string;
  bed: string;
  reason?: string;
  attendingDoctorId?: string;
  attendingDoctor?: EncounterDoctor | null;
}

export interface DischargeInfo {
  dischargedAt: string;
  disposition: "home" | "follow_up";
  notes?: string;
  followUpDate?: string;
}

export interface Encounter {
  _id?: string;
  id?: string;
  encounterCode: string;
  organizationId: string;
  patientId: string;
  encounterType: EncounterType;
  status: EncounterStatus;
  followUpDate?: string;
  admission?: AdmissionInfo;
  discharge?: DischargeInfo;
  admissionDay?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoundSchedule {
  id: string;
  _id?: string;
  encounterId: string;
  organizationId?: string;
  date?: string;
  dateKey: string;
  roundNumber: number;
  roundName: string;
  roundType: RoundType | string;
  status: RoundScheduleStatus;
  scheduledTime?: string | null;
  consultationId?: string | null;
  isCurrent?: boolean;
  isDone?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EncounterRound {
  sessionId: string;
  title: string;
  roundType: RoundType | string;
  roundLabel: string;
  admissionDay?: number;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  isToday: boolean;
  isCurrent: boolean;
  isDone: boolean;
  doctor?: EncounterDoctor | null;
}

export interface AdmissionTimelineItem {
  sessionId: string;
  label: string;
  admissionDay: number;
  roundType?: RoundType | string;
  roundLabel?: string;
  status: string;
  completedAt?: string | null;
  createdAt?: string | null;
  isCurrent: boolean;
}

export interface EncounterBundle {
  encounter: Encounter;
  rounds: EncounterRound[];
  todayRounds: EncounterRound[];
  todaySchedule?: RoundSchedule[];
  nextPendingRound?: RoundSchedule | null;
  hasNextRoundToday?: boolean;
  allRoundsCompletedToday?: boolean;
  admissionTimeline: AdmissionTimelineItem[];
  currentSessionId: string;
}

export interface AdmitPatientData {
  ward: string;
  bed: string;
  reason?: string;
  attendingDoctorId: string;
  admittedAt?: string;
}

export interface CreateRoundData {
  roundType?: RoundType;
  roundLabel?: string;
  roundScheduleId?: string;
}

export interface DoctorQueueItem {
  kind: "op_session" | "ip_encounter";
  sessionId: string | null;
  encounterId: string | null;
  patient: import("@/types/patient.types").Patient | null;
  session?: import("@/types/session.types").Session | null;
  encounter?: Encounter | null;
  encounterType: EncounterType;
  status?: string;
  admissionDay?: number | null;
  ward?: string | null;
  bed?: string | null;
  nextRoundLabel?: string | null;
  nextRoundStatus?: RoundScheduleStatus | null;
  nextRoundScheduleId?: string | null;
  allRoundsCompletedToday?: boolean;
  todaySchedule?: RoundSchedule[];
  hasTodaySession?: boolean;
}
