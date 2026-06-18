import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import {
  CreateSessionData,
  Session,
  SessionStatus,
  UpdateSessionData,
} from "@/types/session.types";
import { toast } from "sonner";

export const useSessionMutations = () => {
  const queryClient = useQueryClient();

  const createSession = useMutation({
    mutationFn: (data: CreateSessionData) => sessionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sessionKeys.stats() });
      toast.success("Session created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create session");
    },
  });

  const updateSession = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSessionData }) =>
      sessionService.update(id, data),
    onSuccess: (_data: Session, variables) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sessionKeys.stats() });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(variables.id),
      });
      toast.success("Session updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update session");
    },
  });

  const updateSessionStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SessionStatus }) =>
      sessionService.updateStatus(id, status),
    onSuccess: (_data: Session, variables) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sessionKeys.stats() });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(variables.id),
      });
      toast.success("Session status updated");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update session status",
      );
    },
  });

  const deleteSession = useMutation({
    mutationFn: (id: string) => sessionService.delete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sessionKeys.stats() });
      queryClient.removeQueries({ queryKey: sessionKeys.detail(id) });
      toast.success("Session deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete session");
    },
  });

  return {
    createSession,
    updateSession,
    updateSessionStatus,
    deleteSession,
  };
};
