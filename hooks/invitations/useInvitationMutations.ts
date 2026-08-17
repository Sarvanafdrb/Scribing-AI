import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { invitationService } from "@/services/invitation.service";
import { invitationKeys } from "@/services/invitation.queries";
import { CreateInvitationData } from "@/types/invitation.types";
import { toast } from "sonner";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message || fallback;
  }
  return fallback;
};
export const useInvitationMutations = () => {
  const queryClient = useQueryClient();

  const resendInvitation = useMutation({
    mutationFn: (id: string) => invitationService.resend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
      toast.success("Invitation resent successfully");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to resend invitation"));
    },
  });

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => invitationService.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
      toast.success("Invitation revoked successfully");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to revoke invitation"));
    },
  });

  const createInvitation = useMutation({
    mutationFn: (data: CreateInvitationData) => invitationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
      toast.success("Invitation sent successfully");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Failed to send invitation"));
    },
  });

  return {
    resendInvitation,
    revokeInvitation,
    createInvitation,
  };
};
