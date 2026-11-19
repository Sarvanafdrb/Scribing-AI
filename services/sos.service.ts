import { api } from "@/services/api";
import type {
  SosActiveResponse,
  SosAlert,
  TriggerSosData,
} from "@/types/sos.types";

export const sosService = {
  trigger: async (data: TriggerSosData): Promise<SosAlert> => {
    const response = await api.post("/sos", data);
    return response.data.data;
  },

  listActive: async (organizationId: string): Promise<SosActiveResponse> => {
    const response = await api.get("/sos/active", {
      params: { organizationId },
    });
    return response.data.data;
  },

  listHistory: async (
    organizationId: string,
    params?: { page?: number; limit?: number; status?: string },
  ) => {
    const response = await api.get("/sos/history", {
      params: { organizationId, ...params },
    });
    return response.data.data as {
      alerts: SosAlert[];
      pagination: { page: number; limit: number; total: number };
    };
  },

  acknowledge: async (id: string, note?: string) => {
    const response = await api.patch(`/sos/${id}/acknowledge`, { note });
    return response.data.data as SosAlert;
  },

  respond: async (id: string, note?: string) => {
    const response = await api.patch(`/sos/${id}/respond`, { note });
    return response.data.data as SosAlert;
  },

  resolve: async (id: string, note?: string) => {
    const response = await api.patch(`/sos/${id}/resolve`, { note });
    return response.data.data as SosAlert;
  },
};