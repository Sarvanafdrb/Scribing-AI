import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patientService } from "@/services/patient.service";
import { patientKeys } from "@/services/patient.queries";
import { sessionKeys } from "@/services/session.queries";
import {
  CreatePatientData,
  Patient,
  UpdatePatientData,
} from "@/types/patient.types";
import { toast } from "sonner";

const invalidateDoctorWorkspaceQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  queryClient.invalidateQueries({ queryKey: sessionKeys.all });
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey.includes("doctor-queue"),
  });
};

export const usePatientMutations = () => {
  const queryClient = useQueryClient();

  const createPatient = useMutation({
    mutationFn: (data: CreatePatientData) => patientService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      invalidateDoctorWorkspaceQueries(queryClient);
      toast.success("Patient created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create patient");
    },
  });

  const updatePatient = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePatientData }) =>
      patientService.update(id, data),
    onSuccess: (_data: Patient, variables) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: patientKeys.detail(variables.id),
      });
      invalidateDoctorWorkspaceQueries(queryClient);
      toast.success("Patient updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update patient");
    },
  });

  const activatePatient = useMutation({
    mutationFn: (id: string) => patientService.setActive(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      toast.success("Patient activated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to activate patient",
      );
    },
  });

  const deactivatePatient = useMutation({
    mutationFn: (id: string) => patientService.setActive(id, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      toast.success("Patient deactivated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to deactivate patient",
      );
    },
  });

  return {
    createPatient,
    updatePatient,
    activatePatient,
    deactivatePatient,
  };
};
