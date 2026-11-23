"use client";

import { use } from "react";
import { AdminAvailabilityDetail } from "@/components/availability/AdminAvailabilityDetail";

export default function AdminStaffAvailabilityDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  return <AdminAvailabilityDetail kind="staff" userId={userId} />;
}