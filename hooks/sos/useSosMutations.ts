import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sosService } from "@/services/sos.service";
import type { TriggerSosData } from "@/types/sos.types";
import { sosKeys } from "./useSosAlerts";

export function useSosMutations(organizationId?: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (organizationId) {
      queryClient.invalidateQueries({
        queryKey: sosKeys.active(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: sosKeys.history(organizationId),
      });
    } else {
      queryClient.invalidateQueries({ queryKey: sosKeys.all });
    }
  };

  const triggerSos = useMutation({
    mutationFn: (data: TriggerSosData) => sosService.trigger(data),
    onSuccess: () => {
      invalidate();
      toast.success("SOS alert sent to the emergency response team.");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "Failed to trigger SOS");
    },
  });

  const acknowledge = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      sosService.acknowledge(id, note),
    onSuccess: () => {
      invalidate();
      toast.success("SOS acknowledged");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "Failed to acknowledge SOS");
    },
  });

  const respond = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      sosService.respond(id, note),
    onSuccess: () => {
      invalidate();
      toast.success("Response team en route");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "Failed to update SOS");
    },
  });

  const resolve = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      sosService.resolve(id, note),
    onSuccess: () => {
      invalidate();
      toast.success("SOS resolved");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "Failed to resolve SOS");
    },
  });

  return { triggerSos, acknowledge, respond, resolve };
}