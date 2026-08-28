import { api } from "@/services/api";

export type SmsNotificationStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "rejected";

export interface SmsNotification {
  id: string;
  organizationId: string;
  sessionId: string;
  patientId: string;
  sentByUserId: string;
  recipientPhone: string;
  provider: string;
  templateId: string;
  dltTemplateId?: string;
  providerMessageId?: string;
  status: SmsNotificationStatus;
  failureReason?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const smsService = {
  sendSessionSms: async (sessionId: string): Promise<SmsNotification> => {
    const response = await api.post(`/sessions/${sessionId}/sms`, {});
    return response.data.data;
  },

  getLatestSessionSms: async (
    sessionId: string,
  ): Promise<SmsNotification | null> => {
    const response = await api.get(`/sessions/${sessionId}/sms/latest`);
    return response.data.data;
  },
};

export const getSmsApiErrorMessage = (
  error: unknown,
  fallback = "Unable to send SMS",
): string => {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    return response?.data?.message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};
