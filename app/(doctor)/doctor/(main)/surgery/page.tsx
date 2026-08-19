"use client";

import { Scissors } from "lucide-react";
import { DoctorShell } from "@/components/doctor/DoctorShell";

export default function DoctorSurgeryPage() {
  return (
    <DoctorShell
      title="Surgery"
      description="Surgical scheduling and management."
    >
      <div className="glass flex flex-col items-center rounded-3xl px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
          <Scissors className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Surgery module pending
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          No surgery model, API, or scheduling backend exists in this
          application yet. This navigation section is reserved for when
          surgical workflows are implemented.
        </p>
        <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
          Dashboard &quot;Scheduled Surgery&quot; will remain unavailable until a
          surgery data source is added.
        </p>
      </div>
    </DoctorShell>
  );
}
