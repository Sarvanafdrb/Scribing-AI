"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProfileForm } from "@/app/(admin)/settings/components/ProfileForm";

export default function DoctorProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <Link
          href="/doctor/workspace"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update your personal details and professional information.
          </p>
        </div>
      </div>

      <ProfileForm />
    </div>
  );
}
