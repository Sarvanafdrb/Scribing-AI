"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePatient } from "@/hooks/patients/usePatients";
import { usePatientMutations } from "@/hooks/patients/usePatientMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { PatientDetailsTab } from "../components/PatientDetailsTab";
import { PatientRelatedTab } from "../components/PatientRelatedTab";
import type { UpdatePatientData } from "@/types/patient.types";
import { getPatientFullName } from "@/utils/patient.utils";
import { cn } from "@/lib/utils";

type PatientTab = "details" | "related";

export default function PatientDetailsPage() {
  const params = useParams();
  const rawId = params?.id;
  const patientId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");
  const [activeTab, setActiveTab] = useState<PatientTab>("details");
  const { data: patient, isLoading, isPending, isFetching, isError } =
    usePatient(patientId);
  const { updatePatient, activatePatient, deactivatePatient } =
    usePatientMutations();
  const { canEditPatient, canManagePatientStatus } = useAccessControl();

  if (!patientId || isPending || isLoading || (isFetching && !patient)) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 text-center">
        <h2 className="text-lg font-semibold">Patient not found</h2>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/patients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patients
          </Link>
        </Button>
      </div>
    );
  }

  const recordId = String(patient.id || patient._id || patientId);
  const isActive = patient.isActive !== false;
  const canEdit = canEditPatient() && isActive;
  const fullName = getPatientFullName(patient);

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

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {fullName || "Patient"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm text-muted-foreground">
              {patient.patientCode}
            </p>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={isActive ? "bg-primary" : undefined}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditPatient() && isActive ? (
            <Button asChild className="rounded-full">
              <Link href={`/patients/edit/${patientId}`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Patient
              </Link>
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/patients/edit/${patientId}`}>Open full edit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/patients">Back to list</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border-b border-border/60">
        <nav className="flex gap-1" aria-label="Patient sections">
          {(
            [
              { key: "details", label: "Details" },
              { key: "related", label: "Related" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "-mb-px border-b px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "details" ? (
        <PatientDetailsTab
          patient={patient}
          patientId={recordId}
          canEdit={canEdit}
          onUpdateField={handleInlineUpdate}
        />
      ) : (
        <PatientRelatedTab patient={patient} patientId={recordId} />
      )}
    </div>
  );
}
