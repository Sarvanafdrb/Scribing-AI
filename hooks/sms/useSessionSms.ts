import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getSmsApiErrorMessage,
  smsService,
} from "@/services/sms.service";
import { smsKeys } from "@/services/sms.queries";

export const useSessionSms = (sessionId: string, enabled = true) => {
  const queryClient = useQueryClient();

  const latestQuery = useQuery({
    queryKey: smsKeys.latest(sessionId),
    queryFn: () => smsService.getLatestSessionSms(sessionId),
    enabled: Boolean(sessionId) && enabled,
  });

  const sendMutation = useMutation({
    mutationFn: () => smsService.sendSessionSms(sessionId),
    onSuccess: (notification) => {
      queryClient.setQueryData(smsKeys.latest(sessionId), notification);
      toast.success("SMS sent successfully");
    },
    onError: (error: unknown) => {
      toast.error(getSmsApiErrorMessage(error));
    },
  });

  return {
    latestSms: latestQuery.data,
    isLoadingLatest: latestQuery.isLoading,
    sendSms: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
  };
};
