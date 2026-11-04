"use client";

import { AccessDenied } from "@/components/shared/AccessDenied";
import { IpPharmacyAdmissionSearch } from "@/components/ip-pharmacy/IpPharmacyAdmissionSearch";
import { useAccessControl } from "@/hooks/useAccessControl";

export default function IpPharmacyIndexPage() {
  const { canViewIpMedicineBillingSummary } = useAccessControl();

  if (!canViewIpMedicineBillingSummary()) {
    return (
      <AccessDenied message="You do not have permission to access IP pharmacy." />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="glass rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">IP pharmacy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Find inpatient admissions to dispense medicines, record payments, and
          manage returns. This search does not include clinical notes or billing
          totals.
        </p>
      </div>
      <div className="glass rounded-3xl p-6">
        <IpPharmacyAdmissionSearch />
      </div>
    </div>
  );
}
