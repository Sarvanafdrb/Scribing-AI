"use client";

import type { Patient } from "@/types/patient.types";
import {
  formatPatientDateOfBirth,
  getPatientAge,
  getPatientFullName,
} from "@/utils/patient.utils";
import { cn } from "@/lib/utils";

const formatGender = (gender?: string) => {
  if (!gender || gender === "unknown") return "—";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

interface DoctorWorkspacePatientIdentityProps {
  patient: Patient | null;
  departmentName?: string | null;
  compact?: boolean;
  className?: string;
}

export function DoctorWorkspacePatientIdentity({
  patient,
  departmentName,
  compact = false,
  className,
}: DoctorWorkspacePatientIdentityProps) {
  const patientAge = getPatientAge(patient);
  const dobLabel = formatPatientDateOfBirth(patient?.dateOfBirth);

  const detailParts = [
    patient?.patientCode ? `ID ${patient.patientCode}` : null,
    dobLabel !== "—" ? `DOB ${dobLabel}` : null,
    patientAge !== null ? `${patientAge} yrs` : null,
    patient?.gender ? formatGender(patient.gender) : null,
    patient?.phoneNumber ? patient.phoneNumber : null,
    departmentName ? departmentName : null,
  ].filter(Boolean);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <h2
          className={cn(
            "truncate font-semibold text-foreground",
            compact ? "text-base" : "text-lg",
          )}
        >
          {getPatientFullName(patient)}
        </h2>
        {patient?.patientCode ? (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-foreground">
            {patient.patientCode}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "text-muted-foreground",
          compact ? "text-xs leading-snug" : "text-sm",
        )}
      >
        {detailParts.join(" · ")}
      </p>
    </div>
  );
}
