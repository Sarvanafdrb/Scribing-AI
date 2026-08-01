export type EncounterType = "OP" | "IP";
export type EncounterStatus = "active" | "discharged" | "closed";
export type RoundType =
  | "morning"
  | "afternoon"
  | "night"
  | "custom"
  | "consultation";
export type DispositionType = "home" | "follow_up" | "admit";

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
}

export interface Encounter {
  _id?: string;
  id?: string;
  encounterCode: string;
  organizationId: string;
  patientId: string;
  encounterType: EncounterType;
  status: EncounterStatus;
  admission?: AdmissionInfo;
  discharge?: DischargeInfo;
  admissionDay?: number;
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
}
