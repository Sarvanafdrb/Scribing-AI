"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DoctorShell } from "@/components/doctor/DoctorShell";
import { ConsultationPreVisitView } from "@/components/doctor/ConsultationPreVisitView";

function ConsultationPreVisitPatientContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = String(params?.patientId || "");
  const appointmentId = searchParams.get("appointmentId") || undefined;
  const reason = searchParams.get("reason") || undefined;

  return (
    <ConsultationPreVisitView
      patientId={patientId}
      appointmentReason={reason || (appointmentId ? "Scheduled visit" : undefined)}
    />
  );
}

export default function ConsultationPreVisitPatientPage() {
  return (
    <DoctorShell title="">
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <ConsultationPreVisitPatientContent />
      </Suspense>
    </DoctorShell>
  );
}
