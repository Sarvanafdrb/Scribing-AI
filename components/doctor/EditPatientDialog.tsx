"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PatientForm } from "@/app/(admin)/patients/components/PatientForm";
import { usePatientMutations } from "@/hooks/patients/usePatientMutations";
import type {
  CreatePatientData,
  Patient,
  UpdatePatientData,
} from "@/types/patient.types";

interface EditPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  onUpdated?: () => void;
}

export function EditPatientDialog({
  open,
  onOpenChange,
  patient,
  onUpdated,
}: EditPatientDialogProps) {
  const { updatePatient } = usePatientMutations();
  const patientId = String(patient?.id || patient?._id || "");

  const handleSubmit = async (data: CreatePatientData | UpdatePatientData) => {
    if (!patientId) return;
    await updatePatient.mutateAsync({
      id: patientId,
      data: data as UpdatePatientData,
    });
    onUpdated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[90vh] w-[min(96vw,640px)] max-w-none flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-none"
      >
        <DialogHeader className="border-b border-border/50 px-6 py-4">
          <DialogTitle>Edit Patient</DialogTitle>
          <DialogDescription>
            Update patient demographics
            {patient?.patientCode ? ` · ${patient.patientCode}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {open && patient ? (
            <PatientForm
              initialData={patient}
              onSubmit={handleSubmit}
              isLoading={updatePatient.isPending}
              submitLabel="Save Changes"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
