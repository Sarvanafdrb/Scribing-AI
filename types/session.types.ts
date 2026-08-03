import type { TranscriptData } from "@/types/transcript.types";
import type { Patient } from "@/types/patient.types";
import type { AiNotes } from "@/types/ai-notes.types";
import type {
  AdmissionTimelineItem,
  DispositionType,
  Encounter,
  EncounterRound,
  RoundSchedule,
  RoundType,
} from "@/types/encounter.types";

export type SessionType = "consultation" | "follow_up" | "diagnostic" | "other";

export type VisitType = "outpatient" | "inpatient";

export type SessionStatus =
  | "created"
  | "recording"
  | "paused"
  | "interrupted"
  | "resumed"
  | "uploading"
  | "processing"
  | "transcript_ready"
  | "ai_notes_generated"
  | "ready_for_review"
  | "completed"
  | "failed";

export interface RecordingSegment {
  url: string;
  duration: number;
  fileName?: string;
  transcriptText?: string;
  uploadedAt?: string;
}

export interface SessionUser {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  qualification?: string;
  signature?: string;
}

export interface SessionOrganization {
  _id?: string;
  id?: string;
  name?: string;
  organizationCode?: string;
  logo?: string;
  address?: string;
  contactNumber?: string;
}

export interface LastVisit {
  date: string;
  sessionType?: SessionType | string;
}

export interface PreviousHistoryAiNotes {
  summary?: string;
  assessment?: string;
  plan?: string;
  medications?: AiNotes["medications"];
}

export interface PreviousHistoryItem {
  sessionId: string;
  completedAt?: string | null;
  title: string;
  aiNotes: PreviousHistoryAiNotes;
  admissionDay?: number;
  roundType?: RoundType | string;
  roundLabel?: string;
  timelineLabel?: string;
}

export interface SessionVitals {
  temperature?: number;
  bloodPressure?: {
    systolic?: number;
    diastolic?: number;
  };
  heartRate?: number;
  spo2?: number;
  weight?: number;
}

export interface Session {
  _id?: string;
  id?: string;
  sessionCode: string;
  organizationId: string | SessionOrganization;
  patientId: string | Patient;
  userId: string | SessionUser;
  title: string;
  description?: string;
  sessionType: SessionType;
  visitType?: VisitType;
  admittedDate?: string;
  encounterId?: string;
  roundType?: RoundType;
  roundLabel?: string;
  admissionDay?: number;
  ward?: string;
  bed?: string;
  disposition?: DispositionType | null;
  status: SessionStatus;
  audioUrl?: string;
  audioPlaybackUrl?: string | null;
  recordingSegments?: RecordingSegment[];
  totalDuration?: number;
  transcript?: string;
  transcriptData?: TranscriptData;
  aiNotes?: AiNotes;
  vitals?: SessionVitals;
  duration?: number;
  startedAt?: string;
  completedAt?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastVisit?: LastVisit | null;
  previousHistory?: PreviousHistoryItem[];
  encounter?: Encounter | null;
  rounds?: EncounterRound[];
  todayRounds?: EncounterRound[];
  todaySchedule?: RoundSchedule[];
  nextPendingRound?: RoundSchedule | null;
  hasNextRoundToday?: boolean;
  allRoundsCompletedToday?: boolean;
  admissionTimeline?: AdmissionTimelineItem[];
}

export interface CreateSessionData {
  title?: string;
  description?: string;
  organizationId: string;
  patientId: string;
  userId: string;
  sessionType: SessionType;
  vitals?: SessionVitals;
}

export interface UpdateSessionData {
  title?: string;
  description?: string;
  sessionType?: SessionType;
  status?: SessionStatus;
  audioUrl?: string;
  transcript?: string;
  duration?: number;
  isActive?: boolean;
  vitals?: SessionVitals;
}

export interface SessionStatusCounts {
  created: number;
  recording: number;
  paused?: number;
  interrupted?: number;
  resumed?: number;
  uploading: number;
  processing: number;
  transcript_ready: number;
  ai_notes_generated: number;
  ready_for_review: number;
  completed: number;
  failed: number;
}

export interface SessionStats {
  total: number;
  activeCount: number;
  statusCounts: SessionStatusCounts;
}
