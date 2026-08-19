import { redirect } from "next/navigation";

/** Legacy bootstrap URL — consultations list replaces auto-open behavior. */
export default function DoctorWorkspaceIndexPage() {
  redirect("/doctor/consultations");
}
