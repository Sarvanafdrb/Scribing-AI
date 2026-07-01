export type AiNotesStatus = "pending" | "processing" | "completed" | "failed";

export interface AiNotes {
  summary?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  generatedAt?: string;
  status?: AiNotesStatus;
  error?: string;
}

export interface GenerateAiNotesResponse {
  aiNotes: AiNotes;
  session: import("@/types/session.types").Session;
}
