"use client";

import { MyAvailabilityWorkspace } from "@/components/availability/MyAvailabilityWorkspace";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { useAccessControl } from "@/hooks/useAccessControl";

export default function StaffMyAvailabilityPage() {
  const { canEditAvailability } = useAccessControl();

  if (!canEditAvailability()) {
    return (
      <AccessDenied message="You do not have permission to manage your availability." />
    );
  }

  return (
    <MyAvailabilityWorkspace
      mode="staff"
      title="My Availability"
      description="Your staff schedule is separate from doctor appointment booking."
    />
  );
}