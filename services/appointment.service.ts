import { api } from "@/services/api";
import type {
  Appointment,
  CancelAppointmentData,
  CheckInAppointmentResult,
  CreateAppointmentData,
  RescheduleAppointmentData,
  UpdateAppointmentData,
} from "@/types/appointment.types";

export const appointmentService = {
  getAll: async (params?: {
    organizationId?: string;
    patientId?: string;
    doctorId?: string;
    status?: string;
    today?: string;
    upcoming?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/appointments", { params });
    const { data, pagination } = response.data;

    return {
      appointments: (data || []) as Appointment[],
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      limit: pagination?.limit || 20,
      totalPages: pagination?.totalPages || 1,
    };
  },

  getById: async (id: string): Promise<Appointment> => {
    const response = await api.get(`/appointments/${id}`);
    return response.data.data;
  },

  create: async (data: CreateAppointmentData): Promise<Appointment> => {
    const response = await api.post("/appointments", data);
    return response.data.data;
  },

  update: async (
    id: string,
    data: UpdateAppointmentData,
  ): Promise<Appointment> => {
    const response = await api.patch(`/appointments/${id}`, data);
    return response.data.data;
  },

  cancel: async (
    id: string,
    data: CancelAppointmentData,
  ): Promise<Appointment> => {
    const response = await api.post(`/appointments/${id}/cancel`, data);
    return response.data.data;
  },

  reschedule: async (
    id: string,
    data: RescheduleAppointmentData,
  ): Promise<Appointment> => {
    const response = await api.post(`/appointments/${id}/reschedule`, data);
    return response.data.data;
  },

  checkIn: async (id: string): Promise<CheckInAppointmentResult> => {
    const response = await api.post(`/appointments/${id}/check-in`);
    return response.data.data;
  },

  getAvailableDoctors: async (
    organizationId: string,
    appointmentDate: string,
  ) => {
    const response = await api.get("/appointments/availability/doctors", {
      params: { organizationId, appointmentDate },
    });
    return response.data.data as {
      configured: boolean;
      doctors: Array<{
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
      }>;
    };
  },

  getDoctorSlots: async (
    organizationId: string,
    doctorId: string,
    appointmentDate: string,
  ) => {
    const response = await api.get("/appointments/availability/slots", {
      params: { organizationId, doctorId, appointmentDate },
    });
    return response.data.data as {
      configured: boolean;
      slots: Array<{
        startTime: string;
        endTime: string;
        startUtc: string;
        endUtc: string;
      }>;
      message?: string;
    };
  },

  getAudit: async (id: string) => {
    const response = await api.get(`/appointments/${id}/audit`);
    return response.data.data;
  },

  listRescheduleApprovals: async (
    organizationId: string,
    status: "pending" | "approved" | "rejected" = "pending",
  ) => {
    const response = await api.get("/appointments/reschedule-approvals", {
      params: { organizationId, status },
    });
    return response.data.data as Array<{
      id: string;
      appointmentId: string;
      status: string;
      reason?: string;
      appointmentDate: string;
      startTime: string;
      endTime?: string;
      createdAt?: string;
      originalScheduledStart?: string;
      originalScheduledEnd?: string;
      patient?: { id: string; name: string; patientCode?: string };
      doctor?: { id: string; name: string; email?: string };
      requestedBy?: { id: string; name: string; email?: string };
    }>;
  },

  requestRescheduleApproval: async (
    id: string,
    data: RescheduleAppointmentData,
  ) => {
    const response = await api.post(
      `/appointments/${id}/reschedule/request-approval`,
      data,
    );
    return response.data.data;
  },

  reviewRescheduleApproval: async (
    requestId: string,
    decision: "approved" | "rejected",
    reviewNote?: string,
  ) => {
    const response = await api.post(
      `/appointments/reschedule-approvals/${requestId}/review`,
      { decision, reviewNote },
    );
    return response.data.data;
  },

  correctNoShow: async (id: string, reason: string) => {
    const response = await api.post(`/appointments/${id}/no-show/correct`, {
      reason,
    });
    return response.data.data;
  },

  getDoctorSchedule: async (organizationId: string, doctorId: string) => {
    const response = await api.get(`/appointments/schedules/${doctorId}`, {
      params: { organizationId },
    });
    return response.data.data;
  },

  listDoctorLeave: async (organizationId: string, doctorId: string) => {
    const response = await api.get(
      `/appointments/schedules/${doctorId}/leave`,
      { params: { organizationId } },
    );
    return response.data.data as Array<{
      _id?: string;
      id?: string;
      startDate: string;
      endDate: string;
      reason?: string;
    }>;
  },

  createDoctorLeave: async (
    organizationId: string,
    doctorId: string,
    data: { startDate: string; endDate: string; reason?: string },
  ) => {
    const response = await api.post(
      `/appointments/schedules/${doctorId}/leave`,
      { organizationId, ...data },
    );
    return response.data.data;
  },

  deleteDoctorLeave: async (organizationId: string, leaveId: string) => {
    const response = await api.delete(
      `/appointments/schedules/leave/${leaveId}`,
      { params: { organizationId } },
    );
    return response.data.data;
  },
};
