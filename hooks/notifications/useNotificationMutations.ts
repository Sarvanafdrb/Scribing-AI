import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";
import { notificationKeys } from "@/services/notification.queries";
import type { NotificationsResponse } from "@/types/notification.types";
import { toast } from "sonner";

export const useNotificationMutations = () => {
  const queryClient = useQueryClient();

  const markAsRead = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to mark notification as read",
      );
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success("All notifications marked as read");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to mark all notifications as read",
      );
    },
  });

  /** Dismiss from UI state/cache. No backend delete API yet — local only. */
  const dismissNotification = useCallback(
    (id: string, wasUnread: boolean) => {
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: notificationKeys.all },
        (current) => {
          if (!current) return current;

          const notifications = current.notifications.filter(
            (notification) =>
              (notification.id || notification._id || "") !== id,
          );

          return {
            ...current,
            notifications,
            unreadCount: wasUnread
              ? Math.max(0, current.unreadCount - 1)
              : current.unreadCount,
          };
        },
      );
    },
    [queryClient],
  );

  return { markAsRead, markAllAsRead, dismissNotification };
};
