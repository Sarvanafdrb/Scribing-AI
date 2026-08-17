import { useMutation, useQuery } from "@tanstack/react-query";
import { invitationService } from "@/services/invitation.service";
import { invitationKeys } from "@/services/invitation.queries";
import { AcceptInvitationPayload } from "@/types/invitation.types";

export const useInvitationAcceptPreview = (token: string) =>
  useQuery({
    queryKey: invitationKeys.acceptPreview(token),
    queryFn: () => invitationService.getAcceptPreview(token),
    enabled: Boolean(token),
    retry: false,
  });

export const useAcceptInvitation = () =>
  useMutation({
    mutationFn: (payload: AcceptInvitationPayload) =>
      invitationService.accept(payload),
  });
