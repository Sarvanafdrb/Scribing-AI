import { useMutation, useQueryClient } from "@tanstack/react-query";
import { appointmentService } from "@/services/appointment.service";
import { appointmentKeys } from "@/services/appointment.queries";
import { sessionKeys } from "@/services/session.queries";
import type {
  CancelAppointmentData,
  CreateAppointmentData,
  RescheduleAppointmentData,
  UpdateAppointmentData,
} from "@/types/appointment.types";
import { toast } from "sonner";

export const useAppointmentMutations = () => {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.includes("doctor-queue"),
    });
    queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
  };

  const createAppointment = useMutation({
    mutationFn: (data: CreateAppointmentData) =>
      appointmentService.create(data),
    onSuccess: () => {
      invalidateAll();
      toast.success("Appointment scheduled successfully");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error?.response?.data?.message || "Failed to schedule appointment",
      );
    },
  });

  const updateAppointment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentData }) =>
      appointmentService.update(id, data),
    onSuccess: (_data, variables) => {
      invalidateAll();
      queryClient.invalidateQueries({
        queryKey: appointmentKeys.detail(variables.id),
      });
      toast.success("Appointment updated successfully");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error?.response?.data?.message || "Failed to update appointment",
      );
    },
  });

  const cancelAppointment = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data?: CancelAppointmentData;
    }) => appointmentService.cancel(id, data),
    onSuccess: (_data, variables) => {
      invalidateAll();
      queryClient.invalidateQueries({
        queryKey: appointmentKeys.detail(variables.id),
      });
      toast.success("Appointment cancelled");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error?.response?.data?.message || "Failed to cancel appointment",
      );
    },
  });

  const rescheduleAppointment = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: RescheduleAppointmentData;
    }) => appointmentService.reschedule(id, data),
    onSuccess: () => {
      invalidateAll();
      toast.success("Appointment rescheduled successfully");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error?.response?.data?.message || "Failed to reschedule appointment",
      );
    },
  });

  const checkInAppointment = useMutation({
    mutationFn: (id: string) => appointmentService.checkIn(id),
    onSuccess: () => {
      invalidateAll();
      toast.success("Consultation started");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error?.response?.data?.message || "Failed to check in appointment",
      );
    },
  });

  return {
    createAppointment,
    updateAppointment,
    cancelAppointment,
    rescheduleAppointment,
    checkInAppointment,
  };
};
