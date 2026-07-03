import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";
import { notificationKeys } from "@/services/notification.queries";

export const useNotifications = (limit = 20) => {
  return useQuery({
    queryKey: notificationKeys.list({ limit }),
    queryFn: () => notificationService.getAll({ limit }),
    refetchInterval: 30000,
  });
};
