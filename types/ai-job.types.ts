export type AiJobOperationType = "transcript" | "ai_notes";

export type AiJobStatus = "queued" | "processing" | "completed" | "failed";

export interface AiJobErrorInfo {
  code?: string;
  message: string;
  retryable?: boolean;
}

export interface AiJob {
  id: string;
  sessionId: string;
  operationType: AiJobOperationType;
  status: AiJobStatus;
  inputHash?: string;
  attempts: number;
  force?: boolean;
  error?: AiJobErrorInfo;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface EnqueueAiNotesResponse {
  job: AiJob;
}
