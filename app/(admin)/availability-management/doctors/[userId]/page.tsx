"use client";

import { use } from "react";
import { AdminAvailabilityDetail } from "@/components/availability/AdminAvailabilityDetail";

export default function AdminDoctorAvailabilityDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  return <AdminAvailabilityDetail kind="doctors" userId={userId} />;
}