"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ScheduleChangeWarning } from "@/types/availability.types";

type ConflictWarningsProps = {
  warnings?: ScheduleChangeWarning[];
  className?: string;
};

export function ConflictWarnings({ warnings, className }: ConflictWarningsProps) {
  if (!warnings?.length) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Existing appointment conflicts</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm">
          These appointments overlap with your change. They were{" "}
          <strong>not</strong> modified automatically — review and reschedule if
          needed.
        </p>
        <ul className="list-disc space-y-1 pl-4 text-sm">
          {warnings.map((w) => (
            <li key={w.appointmentId}>
              {w.appointmentCode ? (
                <span className="font-medium">{w.appointmentCode}: </span>
              ) : null}
              {w.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}