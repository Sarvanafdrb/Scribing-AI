import type { TranscriptData } from "@/types/transcript.types";
import type { Patient } from "@/types/patient.types";

export type SessionType = "consultation" | "follow_up" | "diagnostic" | "other";

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
}

export interface SessionOrganization {
  _id?: string;
  id?: string;
  name?: string;
  organizationCode?: string;
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
  status: SessionStatus;
  audioUrl?: string;
  audioPlaybackUrl?: string | null;
  transcript?: string;
  transcriptData?: TranscriptData;
  duration?: number;
  startedAt?: string;
  completedAt?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSessionData {
  title?: string;
  description?: string;
  organizationId: string;
  patientId: string;
  userId: string;
  sessionType: SessionType;
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
