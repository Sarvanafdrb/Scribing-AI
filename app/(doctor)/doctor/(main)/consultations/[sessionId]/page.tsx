"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DoctorShell } from "@/components/doctor/DoctorShell";
import { ConsultationPreVisitView } from "@/components/doctor/ConsultationPreVisitView";

export default function ConsultationPreVisitPage() {
  const params = useParams();
  const sessionId = String(params?.sessionId || "");

  return (
    <DoctorShell title="">
      {!sessionId ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <ConsultationPreVisitView sessionId={sessionId} />
      )}
    </DoctorShell>
  );
}
