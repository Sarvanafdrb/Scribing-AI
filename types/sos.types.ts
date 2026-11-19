export const SOS_EMERGENCY_TYPES = [
  "cardiac_emergency",
  "breathing_difficulty",
  "unconscious_patient",
  "critical_patient_condition",
  "other_emergency",
] as const;

export type SosEmergencyType = (typeof SOS_EMERGENCY_TYPES)[number];

export const SOS_ALERT_STATUSES = [
  "triggered",
  "acknowledged",
  "responding",
  "resolved",
] as const;

export type SosAlertStatus = (typeof SOS_ALERT_STATUSES)[number];

export interface SosAlert {
  id: string;
  organizationId: string;
  patientId?: string | null;
  patientCode?: string;
  patientName?: string | null;
  emergencyType: SosEmergencyType;
  emergencyLabel: string;
  description?: string;
  location?: string;
  status: SosAlertStatus;
  triggeredBy: string;
  triggeredByName: string;
  triggeredByRole?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  isActive?: boolean;
}

export interface TriggerSosData {
  organizationId?: string;
  patientId?: string;
  patientName?: string;
  emergencyType: SosEmergencyType;
  description?: string;
  location?: string;
  generalEmergency?: boolean;
}

export interface SosActiveResponse {
  summary: {
    active: number;
    critical: number;
    acknowledged: number;
    responding: number;
  };
  alerts: SosAlert[];
}