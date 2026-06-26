"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Edit,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePatient } from "@/hooks/patients/usePatients";
import { useAccessControl } from "@/hooks/useAccessControl";
import {
  getPatientAge,
  getPatientFullName,
} from "@/utils/patient.utils";
import type { PatientOrganization } from "@/types/patient.types";
import {
  HealthcarePageHeader,
  healthcareGlass,
  healthcarePrimaryButton,
  healthcareSolid,
} from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

const formatGender = (gender?: string) => {
  if (!gender) return "—";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
};

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

export default function PatientDetailsPage() {
  const { id } = useParams();
  const patientId = id as string;
  const { data: patient, isLoading } = usePatient(patientId);
  const { canEditPatient } = useAccessControl();

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading patient...</div>;
  }

  if (!patient) {
    return <div className="p-6">Patient not found</div>;
  }

  const org =
    typeof patient.organizationId === "object"
      ? (patient.organizationId as PatientOrganization)
      : null;
  const age = getPatientAge(patient);
  const isActive = patient.isActive !== false;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/patients">
        <Button variant="ghost" className={cn("rounded-xl pl-0", healthcareGlass.button)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Patients
        </Button>
      </Link>

      <HealthcarePageHeader
        title={getPatientFullName(patient)}
        description={patient.patientCode}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={
              isActive
                ? "rounded-lg bg-blue-600"
                : "rounded-lg bg-slate-100 text-slate-600"
            }
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
          {canEditPatient() && isActive && (
            <Link href={`/patients/edit/${patientId}`}>
              <Button className={cn(healthcarePrimaryButton)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Patient
              </Button>
            </Link>
          )}
        </div>
      </HealthcarePageHeader>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className={healthcareSolid.section}>
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Demographics
            </h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Patient Code</dt>
              <dd className="font-mono font-medium">{patient.patientCode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Gender</dt>
              <dd>{formatGender(patient.gender)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Date of Birth</dt>
              <dd>{formatDate(patient.dateOfBirth)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Age</dt>
              <dd>{age !== null ? `${age} years` : "—"}</dd>
            </div>
          </dl>
        </section>

        <section className={healthcareSolid.section}>
          <div className="mb-4 flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                Phone
              </dt>
              <dd>{patient.phoneNumber}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="flex items-center gap-1 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Email
              </dt>
              <dd className="text-right">{patient.email || "—"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Address
              </dt>
              <dd className="max-w-[220px] text-right">
                {patient.address || "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className={cn(healthcareSolid.section, "md:col-span-2")}>
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Organization & Record
            </h2>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
              <dt className="text-muted-foreground">Organization</dt>
              <dd className="font-medium">{org?.name || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDateTime(patient.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd>{formatDateTime(patient.updatedAt)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
