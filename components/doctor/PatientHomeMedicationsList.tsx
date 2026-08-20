"use client";

import { Pill } from "lucide-react";
import { getHomeMedications } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import { cn } from "@/lib/utils";

interface PatientHomeMedicationsListProps {
  patient: Patient | null | undefined;
  className?: string;
  compact?: boolean;
}

export function PatientHomeMedicationsList({
  patient,
  className,
  compact = false,
}: PatientHomeMedicationsListProps) {
  const medications = getHomeMedications(patient);

  return (
    <section className={cn("glass rounded-3xl p-4", className)}>
      <h3
        className={cn(
          "mb-2 flex items-center gap-2 font-semibold tracking-wider text-gray-500 uppercase",
          compact ? "text-[10px]" : "text-[10px]",
        )}
      >
        <Pill className="h-3.5 w-3.5" />
        Home Medications
      </h3>
      {medications.length > 0 ? (
        <ul
          className={cn(
            "space-y-1.5 text-gray-700",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {medications.map((medication) => (
            <li key={medication} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{medication}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn("text-gray-500", compact ? "text-xs" : "text-sm")}>
          No home medications recorded
        </p>
      )}
    </section>
  );
}
