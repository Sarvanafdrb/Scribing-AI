export type UsagePeriod = "daily" | "weekly" | "monthly";

export interface TotalDoctorsReport {
  totalDoctors: number;
}

export interface AverageTimeReport {
  averageSeconds: number;
}

export interface UsageSeriesPoint {
  label: string;
  sessions: number;
  audioUploads: number;
  transcripts: number;
  aiNotes: number;
}

export interface UsageReport {
  period: UsagePeriod;
  sessions: number;
  audioUploads: number;
  transcripts: number;
  aiNotes: number;
  series: UsageSeriesPoint[];
}

export interface TopOrganizationReport {
  organizationName: string;
  sessions: number;
  transcripts: number;
  aiNotes: number;
}

export interface TranscriptionStatusReport {
  success: number;
  failed: number;
  processing: number;
  pending: number;
}
