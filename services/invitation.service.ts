import { api } from "@/services/api";
import {
  AcceptInvitationPayload,
  CreateInvitationData,
  Invitation,
  InvitationPreview,
} from "@/types/invitation.types";

export const invitationService = {
  getAll: async (params?: {
    search?: string;
    status?: string;
    organizationId?: string;
    roleId?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/invitations", { params });
    const { data, pagination } = response.data;

    return {
      invitations: (data || []) as Invitation[],
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      limit: pagination?.limit || 10,
      totalPages: pagination?.totalPages || 1,
    };
  },

  create: async (data: CreateInvitationData): Promise<Invitation> => {
    const response = await api.post("/invitations", data);
    return response.data.data;
  },

  resend: async (id: string): Promise<Invitation> => {
    const response = await api.post(`/invitations/${id}/resend`);
    return response.data.data;
  },

  revoke: async (id: string): Promise<Invitation> => {
    const response = await api.post(`/invitations/${id}/revoke`);
    return response.data.data;
  },

  getAcceptPreview: async (token: string): Promise<InvitationPreview> => {
    const response = await api.get(`/invitations/accept/${encodeURIComponent(token)}`);
    return response.data.data;
  },

  accept: async (payload: AcceptInvitationPayload) => {
    const response = await api.post("/invitations/accept", payload);
    return response.data;
  },
};
