import { api } from "@/services/api";
import {
  CreateSessionData,
  Session,
  SessionStats,
  SessionStatus,
  SessionStatusCounts,
  UpdateSessionData,
} from "@/types/session.types";

export const sessionService = {
  getAll: async (params?: {
    search?: string;
    status?: string;
    sessionType?: string;
    organizationId?: string;
    patientId?: string;
    userId?: string;
    isActive?: string;
    today?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/sessions", { params });
    const { data, pagination, activeCount, inactiveCount, statusCounts } =
      response.data;

    return {
      sessions: (data || []) as Session[],
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      limit: pagination?.limit || 10,
      totalPages: pagination?.totalPages || 1,
      activeCount: activeCount || 0,
      inactiveCount: inactiveCount || 0,
      statusCounts: (statusCounts || {
        created: 0,
        recording: 0,
        uploading: 0,
        processing: 0,
        transcript_ready: 0,
        ai_notes_generated: 0,
        ready_for_review: 0,
        completed: 0,
        failed: 0,
      }) as SessionStatusCounts,
    };
  },

  getStats: async (): Promise<SessionStats> => {
    const response = await api.get("/sessions/stats");
    return response.data.data;
  },

  getById: async (id: string): Promise<Session> => {
    const response = await api.get(`/sessions/${id}`);
    return response.data.data;
  },

  create: async (data: CreateSessionData): Promise<Session> => {
    const response = await api.post("/sessions", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateSessionData): Promise<Session> => {
    const response = await api.put(`/sessions/${id}`, data);
    return response.data.data;
  },

  updateStatus: async (id: string, status: SessionStatus): Promise<Session> => {
    const response = await api.patch(`/sessions/${id}/status`, { status });
    return response.data.data;
  },

  delete: async (id: string): Promise<Session> => {
    const response = await api.delete(`/sessions/${id}`);
    return response.data.data;
  },
};
