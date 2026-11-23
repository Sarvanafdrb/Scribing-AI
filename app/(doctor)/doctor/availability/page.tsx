"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MyAvailabilityWorkspace } from "@/components/availability/MyAvailabilityWorkspace";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { useAccessControl } from "@/hooks/useAccessControl";

export default function DoctorAvailabilityPage() {
  const { canEditAvailability } = useAccessControl();

  if (!canEditAvailability()) {
    return (
      <AccessDenied message="You do not have permission to manage availability." />
    );
  }

  return (
    <div className="space-y-4 px-4 py-8 sm:px-6">
      <Link
        href="/doctor/workspace"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to workspace
      </Link>
      <MyAvailabilityWorkspace
        mode="doctor"
        title="My Availability"
        description="Set your weekly hours, breaks, date overrides, and leave. Conflict warnings show existing appointments that were not changed automatically."
      />
    </div>
  );
}