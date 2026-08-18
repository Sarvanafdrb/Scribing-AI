"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MedicineManagementPanel } from "@/components/shared/medicine/MedicineManagementPanel";
import { useAuthStore } from "@/store/auth.store";
import type { AuthUser } from "@/types/auth.types";
import { getDoctorWorkspaceBackPath } from "@/utils/doctorWorkspaceNavigation";

export default function DoctorMedicinesPage() {
  const user = useAuthStore((state) => state.user) as AuthUser | null;
  const backPath = getDoctorWorkspaceBackPath();
  const organizationId =
    user?.organizationId ||
    user?.organization?.id ||
    user?.organization?._id ||
    "";

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <p className="text-sm text-muted-foreground">
          Medicines are organization-scoped. Your account must belong to an
          organization to manage the formulary.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href={backPath}>Back to workspace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href={backPath}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-teal-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to workspace
      </Link>

      <MedicineManagementPanel
        organizationId={organizationId}
        variant="doctor"
        title="Medicine Formulary"
        description="Organization medicines and condition mappings used in Preview search."
      />
    </div>
  );
}
