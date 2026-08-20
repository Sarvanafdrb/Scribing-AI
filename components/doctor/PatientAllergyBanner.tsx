"use client";

import { AlertTriangle } from "lucide-react";
import { getNormalizedAllergies } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import { cn } from "@/lib/utils";

interface PatientAllergyBannerProps {
  patient: Patient | null | undefined;
  className?: string;
  compact?: boolean;
}

export function PatientAllergyBanner({
  patient,
  className,
  compact = false,
}: PatientAllergyBannerProps) {
  const allergies = getNormalizedAllergies(patient);

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        allergies.length > 0
          ? "border-red-200 bg-red-50"
          : "border-amber-200/80 bg-amber-50/80",
        className,
      )}
      role="note"
      aria-label="Patient allergies"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <AlertTriangle
          className={cn(
            "shrink-0",
            compact ? "h-3.5 w-3.5" : "h-4 w-4",
            allergies.length > 0 ? "text-red-600" : "text-amber-600",
          )}
        />
        <span
          className={cn(
            "font-medium",
            compact ? "text-xs" : "text-sm",
            allergies.length > 0 ? "text-red-700" : "text-amber-800",
          )}
        >
          Allergies
        </span>
      </div>
      {allergies.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {allergies.map((allergy) => (
            <span
              key={allergy}
              className={cn(
                "rounded-md bg-red-100 font-medium text-red-700",
                compact ? "px-2 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs",
              )}
            >
              {allergy}
            </span>
          ))}
        </div>
      ) : (
        <p
          className={cn(
            allergies.length > 0 ? "text-red-600" : "text-amber-800",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          No known allergies recorded
        </p>
      )}
    </div>
  );
}
