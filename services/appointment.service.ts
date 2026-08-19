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
    data?: CancelAppointmentData,
  ): Promise<Appointment> => {
    const response = await api.post(`/appointments/${id}/cancel`, data || {});
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
};
