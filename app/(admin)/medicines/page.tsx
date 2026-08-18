"use client";

import { AccessDenied } from "@/components/shared/AccessDenied";
import { MedicineManagementPanel } from "@/components/shared/medicine/MedicineManagementPanel";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useTenantScope } from "@/hooks/useTenantScope";

const PAGE_SIZE = 100;

export default function MedicinesPage() {
  const { canViewMedicines } = useAccessControl();
  const { organizationId, organizationName, isSuperAdmin, isAllOrganizations } =
    useTenantScope();

  if (!canViewMedicines()) {
    return (
      <AccessDenied message="You do not have permission to view medicines." />
    );
  }

  if (!organizationId && !isSuperAdmin) {
    return (
      <AccessDenied message="Your account must belong to an organization to manage medicines." />
    );
  }

  if (isSuperAdmin && (isAllOrganizations || !organizationId)) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Select an organization
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a workspace from the header to manage medicines for that
          organization.
        </p>
      </div>
    );
  }

  return (
    <MedicineManagementPanel
      organizationId={organizationId}
      organizationName={organizationName}
      variant="admin"
      title="Medicine Management"
      description="Manage the organization medicine master database used by doctors in prescriptions."
      pageSize={PAGE_SIZE}
    />
  );
}
