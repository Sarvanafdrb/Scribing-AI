"use client";



import { useRouter, useSearchParams } from "next/navigation";

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

import { PermissionGuard } from "@/components/shared/PermissionGuard";

import {

  buildReturnUrl,

  sanitizeReturnTo,

} from "@/utils/navigation-return.utils";

import { getPatientId } from "@/utils/patient.utils";



export default function CreatePatientPage() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  const { createPatient } = usePatientMutations();



  const backHref = returnTo || "/patients";

  const backLabel = returnTo === "/sos-emergency"

    ? "Back to SOS Emergency"

    : "Back to Patients";



  const handleSubmit = async (data: CreatePatientData | UpdatePatientData) => {

    const created = await createPatient.mutateAsync(
      returnTo
        ? { data: data as CreatePatientData, silent: true }
        : (data as CreatePatientData),
    );

    const patientId = getPatientId(created);



    if (returnTo && patientId) {

      router.push(

        buildReturnUrl(returnTo, {

          patientId,

          patientLinked: "1",

        }),

      );

      return;

    }



    router.push("/patients");

  };



  return (

    <PermissionGuard

      permission="PATIENT_CREATE"

      message="You do not have permission to create patients."

    >

      <div className="mx-auto max-w-2xl">

        <div className="mb-6">

          <Link href={backHref}>

            <Button

              variant="ghost"

              className={cn("rounded-xl pl-0", healthcareGlass.button)}

            >

              <ArrowLeft className="mr-2 h-4 w-4" />

              {backLabel}

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

                  {returnTo === "/sos-emergency"

                    ? " You will return to the SOS form with this patient selected."

                    : null}

                </CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <PatientForm

              onSubmit={handleSubmit}

              isLoading={createPatient.isPending}

              submitLabel="Create Patient"

              onCancel={() => router.push(backHref)}
            />

          </CardContent>

        </Card>

      </div>

    </PermissionGuard>

  );

}
