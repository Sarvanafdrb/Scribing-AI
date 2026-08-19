import type { Patient } from "@/types/patient.types";
import type { Session } from "@/types/session.types";
import type { User } from "@/types/user.types";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_TYPES = [
  "consultation",
  "follow_up",
  "diagnostic",
  "other",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export interface Appointment {
  _id?: string;
  id?: string;
  appointmentCode?: string;
  organizationId?: string | { _id?: string; id?: string; name?: string };
  patientId?: string | Patient;
  doctorId?: string | User;
  scheduledStart: string;
  scheduledEnd: string;
  appointmentType?: AppointmentType;
  reason?: string;
  notes?: string;
  status: AppointmentStatus;
  sessionId?: string | Session | null;
  rescheduledFromId?: string | null;
  rescheduledToId?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string;
  checkedInAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAppointmentData {
  organizationId: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  appointmentType?: AppointmentType;
  reason?: string;
  notes?: string;
}

export interface UpdateAppointmentData {
  appointmentType?: AppointmentType;
  reason?: string;
  notes?: string;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  status?: "no_show";
}

export interface CancelAppointmentData {
  cancellationReason?: string;
}

export interface RescheduleAppointmentData {
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  reason?: string;
  notes?: string;
}

export interface CheckInAppointmentResult {
  appointment: Appointment;
  session: Session;
}

export const getAppointmentId = (appointment: Appointment) =>
  String(appointment.id || appointment._id || "");

export const formatAppointmentStatus = (status?: AppointmentStatus) => {
  if (!status) return "—";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const formatAppointmentType = (type?: AppointmentType) => {
  if (!type) return "Consultation";
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
