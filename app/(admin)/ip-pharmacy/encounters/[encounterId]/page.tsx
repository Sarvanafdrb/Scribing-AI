"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { IpPharmacyDesk } from "@/components/ip-pharmacy/IpPharmacyDesk";
import { useAccessControl } from "@/hooks/useAccessControl";
import { isValidEncounterIdParam } from "@/utils/ip-medicine-billing.utils";

export default function IpPharmacyEncounterPage() {
  const params = useParams();
  const encounterId = String(params.encounterId ?? "");
  const { canViewIpMedicineBillingSummary } = useAccessControl();

  if (!canViewIpMedicineBillingSummary()) {
    return (
      <AccessDenied message="You do not have permission to access IP pharmacy." />
    );
  }

  if (!isValidEncounterIdParam(encounterId)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <p className="text-sm text-destructive">Invalid admission identifier.</p>
        <Button variant="outline" asChild>
          <Link href="/ip-pharmacy">Back to pharmacy search</Link>
        </Button>
      </div>
    );
  }

  return <IpPharmacyDesk encounterId={encounterId} />;
}
