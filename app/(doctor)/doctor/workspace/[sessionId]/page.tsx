"use client";

import { useParams } from "next/navigation";
import { DoctorWorkspace } from "@/components/doctor/DoctorWorkspace";

export default function DoctorWorkspacePage() {
  const { sessionId } = useParams();
  return <DoctorWorkspace sessionId={sessionId as string} />;
}
