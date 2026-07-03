import { api } from "./api";
import { NotificationsResponse, Notification } from "@/types/notification.types";

export const notificationService = {
  getAll: async (params?: { limit?: number; unreadOnly?: boolean }) => {
    const response = await api.get<{ data: NotificationsResponse }>(
      "/notifications",
      { params },
    );
    return response.data.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.patch<{ data: Notification }>(
      `/notifications/${id}/read`,
    );
    return response.data.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch<{ data: { modifiedCount: number } }>(
      "/notifications/read-all",
    );
    return response.data.data;
  },
};
