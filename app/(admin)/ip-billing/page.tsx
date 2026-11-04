"use client";

import { AccessDenied } from "@/components/shared/AccessDenied";
import { IpAdmissionBillingSearch } from "@/components/ip-billing/IpAdmissionBillingSearch";
import { useAccessControl } from "@/hooks/useAccessControl";

export default function IpBillingIndexPage() {
  const { canViewIpAdmissionBilling } = useAccessControl();

  if (!canViewIpAdmissionBilling()) {
    return (
      <AccessDenied message="You do not have permission to view IP admission billing." />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="glass rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">IP admission billing</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search inpatient admissions to open the billing desk for room rent,
          other charges, payments, and discharge statements.
        </p>
      </div>
      <div className="glass rounded-3xl p-6">
        <IpAdmissionBillingSearch />
      </div>
    </div>
  );
}
