import type { TranscriptData } from "@/types/transcript.types";
import type { Patient } from "@/types/patient.types";
import type { AiNotes } from "@/types/ai-notes.types";

export type SessionType = "consultation" | "follow_up" | "diagnostic" | "other";

export type VisitType = "outpatient" | "inpatient";

export type SessionStatus =
  | "created"
  | "recording"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

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

export interface SessionVitals {
  temperature?: number;
  bloodPressure?: {
    systolic?: number;
    diastolic?: number;
  };
  heartRate?: number;
  spo2?: number;
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
  status: SessionStatus;
  audioUrl?: string;
  audioPlaybackUrl?: string | null;
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
  uploading: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface SessionStats {
  total: number;
  activeCount: number;
  statusCounts: SessionStatusCounts;
}
