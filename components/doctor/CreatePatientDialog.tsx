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
import { sessionService } from "@/services/session.service";
import { useTenantScope } from "@/hooks/useTenantScope";
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
  const { user, organizationId } = useTenantScope();

  const handleSubmit = async (data: CreatePatientData | UpdatePatientData) => {
    const patient = await createPatient.mutateAsync(data as CreatePatientData);

    // Auto-create an OP consultation so the patient appears in the doctor queue
    const patientId = String(patient._id || patient.id || "");
    const userId = String(user?._id || user?.id || "");
    if (patientId && userId && organizationId) {
      try {
        await sessionService.create({
          organizationId,
          patientId,
          userId,
          sessionType: "consultation",
        });
      } catch {
        // Patient was created; session creation failure is non-blocking
      }
    }

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
