"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PatientForm } from "../../components/PatientForm";
import { usePatient } from "@/hooks/patients/usePatients";
import { usePatientMutations } from "@/hooks/patients/usePatientMutations";
import { CreatePatientData, UpdatePatientData } from "@/types/patient.types";
import { healthcareGlass, healthcareSolid } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

export default function EditPatientPage() {
  const params = useParams();
  const rawId = params?.id;
  const patientId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");
  const router = useRouter();
  const { data: patient, isLoading, isPending, isFetching } = usePatient(patientId);
  const { updatePatient } = usePatientMutations();

  const handleSubmit = async (data: CreatePatientData | UpdatePatientData) => {
    await updatePatient.mutateAsync({ id: patientId, data: data as UpdatePatientData });
    router.push(`/patients/${patientId}`);
  };

  if (!patientId || isPending || isLoading || (isFetching && !patient)) {
    return <div className="animate-pulse p-6">Loading patient...</div>;
  }

  if (!patient) {
    return <div className="p-6">Patient not found</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href={`/patients/${patientId}`}>
          <Button variant="ghost" className={cn("rounded-xl pl-0", healthcareGlass.button)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patient
          </Button>
        </Link>
      </div>

      <Card className={healthcareSolid.formCard}>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3">
              <UserRound className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Edit Patient</CardTitle>
              <CardDescription>{patient.patientCode}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PatientForm
            initialData={patient}
            onSubmit={handleSubmit}
            isLoading={updatePatient.isPending}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
