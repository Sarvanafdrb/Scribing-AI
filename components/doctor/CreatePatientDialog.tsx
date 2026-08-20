"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientForm } from "@/app/(admin)/patients/components/PatientForm";
import { usePatientMutations } from "@/hooks/patients/usePatientMutations";
import { useStartConsultation } from "@/hooks/doctor/useStartConsultation";
import { useDebounce } from "@/hooks/useDebounce";
import { useTenantScope } from "@/hooks/useTenantScope";
import { patientService } from "@/services/patient.service";
import { patientKeys } from "@/services/patient.queries";
import { recordDoctorRecentlyViewedPatient } from "@/utils/doctorRecentlyViewed";
import {
  formatPatientOptionLabel,
  getPatientFullName,
  getPatientId,
} from "@/utils/patient.utils";
import type {
  CreatePatientData,
  Patient,
  UpdatePatientData,
} from "@/types/patient.types";

type DialogStep = "search" | "create";

interface CreatePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const RESULT_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

const SOLID_DIALOG_CLASS =
  "flex max-h-[90vh] w-[min(96vw,640px)] max-w-none flex-col gap-0 overflow-hidden rounded-3xl p-0 text-foreground sm:max-w-none";

export function CreatePatientDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePatientDialogProps) {
  const { createPatient } = usePatientMutations();
  const { startConsultation } = useStartConsultation();
  const { organizationId } = useTenantScope();
  const [step, setStep] = useState<DialogStep>("search");
  const [search, setSearch] = useState("");
  const [isStartingConsultation, setIsStartingConsultation] = useState(false);
  const [startingPatientId, setStartingPatientId] = useState<string | null>(
    null,
  );
  const debouncedSearch = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!open) {
      setStep("search");
      setSearch("");
      setIsStartingConsultation(false);
      setStartingPatientId(null);
    }
  }, [open]);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: patientKeys.list({
      organizationId: organizationId || "",
      search: debouncedSearch,
      limit: RESULT_LIMIT,
      page: 1,
      isActive: "true",
      context: "doctor-create-patient-search",
    }),
    queryFn: () =>
      patientService.getAll({
        organizationId: organizationId || undefined,
        search: debouncedSearch || undefined,
        limit: RESULT_LIMIT,
        page: 1,
        isActive: "true",
      }),
    enabled: Boolean(open && organizationId && step === "search"),
    placeholderData: (previousData) => previousData,
  });

  const patients = searchResults?.patients ?? [];
  const hasSearchQuery = debouncedSearch.length > 0;

  const handleClose = () => {
    if (isStartingConsultation || createPatient.isPending) return;
    onOpenChange(false);
  };

  const createConsultationForPatient = async (patientId: string) => {
    if (!patientId) {
      toast.error(
        "Unable to start consultation. Missing doctor or organization.",
      );
      return false;
    }

    recordDoctorRecentlyViewedPatient(patientId);
    await startConsultation(patientId);
    return true;
  };

  const handleSelectExisting = async (patient: Patient) => {
    const patientId = getPatientId(patient);
    if (!patientId || isStartingConsultation) return;

    setIsStartingConsultation(true);
    setStartingPatientId(patientId);
    try {
      const started = await createConsultationForPatient(patientId);
      if (!started) return;
      toast.success(
        `Consultation started for ${getPatientFullName(patient) || "patient"}`,
      );
      onCreated?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err?.response?.data?.message || "Failed to start consultation",
      );
    } finally {
      setIsStartingConsultation(false);
      setStartingPatientId(null);
    }
  };

  const handleSubmit = async (data: CreatePatientData | UpdatePatientData) => {
    const patient = await createPatient.mutateAsync(data as CreatePatientData);

    const patientId = String(patient._id || patient.id || "");
    if (!patientId) {
      onCreated?.();
      onOpenChange(false);
      return;
    }

    try {
      const started = await createConsultationForPatient(patientId);
      if (!started) return;

      toast.success(
        `Consultation started for ${getPatientFullName(patient) || "patient"}`,
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err?.response?.data?.message || "Failed to start consultation",
      );
      toast.message("Patient was created. Start a consultation from the queue.");
      onCreated?.();
      onOpenChange(false);
      return;
    }

    onCreated?.();
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (isStartingConsultation || createPatient.isPending)) {
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        data-solid="true"
        className={SOLID_DIALOG_CLASS}
      >
        <DialogHeader className="shrink-0 border-b border-border bg-white px-6 py-4">
          <DialogTitle>
            {step === "search" ? "Add Patient" : "Create New Patient"}
          </DialogTitle>
          <DialogDescription>
            {step === "search"
              ? "Search existing patients first. If not found, create a new patient."
              : "Register a new patient. Patient code is generated automatically."}
          </DialogDescription>
        </DialogHeader>

        {open && step === "search" ? (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white px-6 py-5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, ID, or phone..."
                  className="rounded-full border-border bg-white pl-9"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                {isFetching ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching patients...
                  </div>
                ) : patients.length > 0 ? (
                  patients.map((patient) => {
                    const patientId = getPatientId(patient);
                    const isStarting =
                      isStartingConsultation && startingPatientId === patientId;

                    return (
                      <button
                        key={patientId}
                        type="button"
                        disabled={isStartingConsultation}
                        onClick={() => void handleSelectExisting(patient)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white px-3 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 disabled:opacity-60"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {getPatientFullName(patient)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatPatientOptionLabel(patient)}
                          </p>
                        </div>
                        {isStarting ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                        ) : (
                          <span className="shrink-0 text-xs font-medium text-primary">
                            Start consultation
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    {hasSearchQuery
                      ? "No patient found for this search."
                      : "Type a name, phone, or patient ID to search."}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-white px-6 py-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-full bg-white"
                  disabled={isStartingConsultation}
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 rounded-full"
                  onClick={() => setStep("create")}
                  disabled={isStartingConsultation}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Patient
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {open && step === "create" ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-3 rounded-full px-2 text-muted-foreground"
              onClick={() => setStep("search")}
              disabled={createPatient.isPending}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to search
            </Button>
            <PatientForm
              onSubmit={handleSubmit}
              isLoading={createPatient.isPending}
              submitLabel="Create Patient"
              onCancel={handleClose}
              actionsVariant="dialog"
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
