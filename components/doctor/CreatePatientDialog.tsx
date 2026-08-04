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
  UpdatePatientData,
} from "@/types/patient.types";

interface CreatePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreatePatientDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePatientDialogProps) {
  const { createPatient } = usePatientMutations();

  const handleSubmit = async (data: CreatePatientData | UpdatePatientData) => {
    await createPatient.mutateAsync(data as CreatePatientData);
    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[90vh] w-[min(96vw,640px)] max-w-none flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-none"
      >
        <DialogHeader className="border-b border-border/50 px-6 py-4">
          <DialogTitle>Create New Patient</DialogTitle>
          <DialogDescription>
            Register a new patient. Patient code is generated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {open ? (
            <PatientForm
              onSubmit={handleSubmit}
              isLoading={createPatient.isPending}
              submitLabel="Create Patient"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
