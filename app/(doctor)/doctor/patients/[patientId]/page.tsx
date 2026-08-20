"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  History,
  Loader2,
  PlayCircle,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { DoctorShell } from "@/components/doctor/DoctorShell";
import { PatientAllergyBanner } from "@/components/doctor/PatientAllergyBanner";
import { PatientHomeMedicationsList } from "@/components/doctor/PatientHomeMedicationsList";
import { PatientDetailsTab } from "@/app/(admin)/patients/components/PatientDetailsTab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePatient } from "@/hooks/patients/usePatients";
import { usePatientMutations } from "@/hooks/patients/usePatientMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useStartConsultation } from "@/hooks/doctor/useStartConsultation";
import {
  formatPatientDateOfBirth,
  getPatientAge,
  getPatientFullName,
} from "@/utils/patient.utils";
import { recordDoctorRecentlyViewedPatient } from "@/utils/doctorRecentlyViewed";
import type { UpdatePatientData } from "@/types/patient.types";

export default function DoctorPatientProfilePage() {
  const params = useParams();
  const patientId = String(params?.patientId || "");
  const { data: patient, isLoading, isError } = usePatient(patientId);
  const { updatePatient, activatePatient, deactivatePatient } =
    usePatientMutations();
  const { canEditPatient, canManagePatientStatus, canCreateSession } =
    useAccessControl();
  const { startConsultation, isStarting } = useStartConsultation();

  useEffect(() => {
    if (patientId) {
      recordDoctorRecentlyViewedPatient(patientId);
    }
  }, [patientId]);

  const recordId = useMemo(
    () => String(patient?.id || patient?._id || patientId),
    [patient, patientId],
  );

  const isActive = patient?.isActive !== false;
  const canEdit = canEditPatient() && isActive;
  const canStart = canCreateSession() && isActive;

  const handleInlineUpdate = async (data: UpdatePatientData) => {
    if (typeof data.isActive === "boolean" && Object.keys(data).length === 1) {
      if (!canManagePatientStatus()) {
        throw new Error("You don't have permission to change patient status.");
      }
      if (data.isActive) {
        await activatePatient.mutateAsync(recordId);
      } else {
        await deactivatePatient.mutateAsync(recordId);
      }
      return;
    }
    await updatePatient.mutateAsync({ id: recordId, data });
  };

  const handleStartConsultation = async () => {
    if (!recordId || !canStart) return;
    try {
      await startConsultation(recordId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err?.response?.data?.message ||
          (error instanceof Error
            ? error.message
            : "Failed to start consultation"),
      );
    }
  };

  const starting = isStarting;
  const fullName = getPatientFullName(patient);
  const age = getPatientAge(patient);

  if (!patientId || isLoading) {
    return (
      <DoctorShell title="Patient Profile">
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading patient…
        </div>
      </DoctorShell>
    );
  }

  if (isError || !patient) {
    return (
      <DoctorShell title="Patient Profile">
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-muted-foreground">Patient not found.</p>
          <Button asChild variant="outline" className="mt-4 rounded-full">
            <Link href="/doctor/patients">Back to Patients</Link>
          </Button>
        </div>
      </DoctorShell>
    );
  }

  return (
    <DoctorShell
      title={fullName || "Patient Profile"}
      description="Review patient identity, allergies, home medications, and history before starting a consultation."
    >
      <div className="mb-4">
        <Link
          href="/doctor/patients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </Link>
      </div>

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {fullName}
            </h2>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={isActive ? "bg-primary" : undefined}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {patient.patientCode}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              formatPatientDateOfBirth(patient.dateOfBirth) !== "—"
                ? `DOB ${formatPatientDateOfBirth(patient.dateOfBirth)}`
                : null,
              age !== null ? `${age} yrs` : null,
              patient.gender && patient.gender !== "unknown"
                ? patient.gender.charAt(0).toUpperCase() +
                  patient.gender.slice(1)
                : null,
              patient.phoneNumber,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            variant="outline"
            className="rounded-full"
          >
            <Link href={`/doctor/patients/${recordId}/history`}>
              <History className="mr-2 h-4 w-4" />
              Previous History
            </Link>
          </Button>
          {canStart ? (
            <Button
              type="button"
              className="rounded-full"
              disabled={starting}
              onClick={() => void handleStartConsultation()}
            >
              {starting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="mr-2 h-4 w-4" />
              )}
              Start Consultation
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PatientAllergyBanner patient={patient} />
        <PatientHomeMedicationsList patient={patient} />
      </div>

      {!isActive ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This patient is inactive. Activate the record before starting a new
          consultation.
        </div>
      ) : null}

      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Stethoscope className="h-4 w-4" />
        Patient record
      </div>

      <PatientDetailsTab
        patient={patient}
        patientId={recordId}
        canEdit={canEdit}
        onUpdateField={handleInlineUpdate}
      />
    </DoctorShell>
  );
}
