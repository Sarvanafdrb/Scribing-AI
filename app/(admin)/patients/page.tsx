"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientFilters } from "./components/PatientFilters";
import { PatientTable } from "./components/PatientTable";
import { PatientSkeleton } from "./components/PatientSkeleton";
import { usePatients } from "@/hooks/patients/usePatients";
import { useAccessControl } from "@/hooks/useAccessControl";
import {
  HealthcarePageHeader,
  healthcareGlass,
  healthcarePrimaryButton,
  healthcareSolid,
} from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function PatientsPage() {
  const { canCreatePatient, canViewPatients } = useAccessControl();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const {
    patients,
    isLoading,
    error,
    total,
    totalPages,
    activeCount,
    inactiveCount,
    refetch,
  } = usePatients({
    search,
    isActive: status === "all" ? undefined : status,
    page,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const handleClearFilters = () => {
    setSearch("");
    setStatus("all");
    setPage(1);
  };

  if (!canViewPatients()) {
    return (
      <div className={cn("p-8 text-center", healthcareSolid.card)}>
        <h1 className="text-xl font-semibold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view patients.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HealthcarePageHeader
        title="Patients"
        description={`Manage patient records • ${total} total`}
      >
        {canCreatePatient() && (
          <Link href="/patients/create">
            <Button className={cn(healthcarePrimaryButton)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
          </Link>
        )}
      </HealthcarePageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className={healthcareSolid.statCard}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{total}</div>
          </CardContent>
        </Card>
        <Card className={healthcareSolid.statCard}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card className={healthcareSolid.statCard}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-500">
              {inactiveCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <PatientFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        onClearFilters={handleClearFilters}
      />

      {isLoading ? (
        <PatientSkeleton count={PAGE_SIZE} />
      ) : error ? (
        <Card className={healthcareSolid.card}>
          <CardContent className="py-8 text-center text-destructive">
            Failed to load patients.{" "}
            <Button variant="link" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <PatientTable
          patients={patients}
          onStatusChange={refetch}
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
