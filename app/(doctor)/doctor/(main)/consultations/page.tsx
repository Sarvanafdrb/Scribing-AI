import { DoctorShell } from "@/components/doctor/DoctorShell";
import { DoctorConsultationsView } from "@/components/doctor/DoctorConsultationsView";

export default function DoctorConsultationsPage() {
  return (
    <DoctorShell
      title="Today's Consultations"
      description="Open a consultation to enter the clinical workspace."
    >
      <DoctorConsultationsView />
    </DoctorShell>
  );
}
