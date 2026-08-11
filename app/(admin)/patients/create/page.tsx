"use client";

import { useRouter } from "next/navigation";
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
import { PatientForm } from "../components/PatientForm";
import { usePatientMutations } from "@/hooks/patients/usePatientMutations";
import { CreatePatientData, UpdatePatientData } from "@/types/patient.types";
import { healthcareGlass, healthcareSolid } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

export default function CreatePatientPage() {
  const router = useRouter();
  const { createPatient } = usePatientMutations();

  const handleSubmit = async (data: CreatePatientData | UpdatePatientData) => {
    await createPatient.mutateAsync(data as CreatePatientData);
    router.push("/patients");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/patients">
          <Button variant="ghost" className={cn("rounded-xl pl-0", healthcareGlass.button)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patients
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
              <CardTitle>Add Patient</CardTitle>
              <CardDescription>
                Register a new patient. Patient code is generated automatically.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PatientForm
            onSubmit={handleSubmit}
            isLoading={createPatient.isPending}
            submitLabel="Create Patient"
            onCancel={() => router.push("/patients")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
