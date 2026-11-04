"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { IpBillingDesk } from "@/components/ip-billing/IpBillingDesk";
import { Button } from "@/components/ui/button";

export default function IpBillingEncounterPage() {
  const params = useParams();
  const encounterId = String(params.encounterId || "");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/ip-billing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to search
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            IP admission billing desk
          </h1>
          <p className="text-sm text-muted-foreground">
            Consolidated inpatient charges, payments, and discharge statement.
          </p>
        </div>
      </div>
      <IpBillingDesk encounterId={encounterId} />
    </div>
  );
}
