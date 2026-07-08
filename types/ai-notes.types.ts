export type AiNotesStatus = "pending" | "processing" | "completed" | "failed";

export interface AiNotesMedication {
  medicine: string;
  morning?: string;
  afternoon?: string;
  night?: string;
  days?: string;
  instructions?: string;
}

export interface AiNotes {
  summary?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  remarks?: string;
  medications?: AiNotesMedication[];
  generatedAt?: string;
  status?: AiNotesStatus;
  error?: string;
}

export interface UpdateAiNotesData {
  summary?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  remarks?: string;
  medications?: AiNotesMedication[];
}

export interface GenerateAiNotesResponse {
  aiNotes: AiNotes;
  session: import("@/types/session.types").Session;
}
