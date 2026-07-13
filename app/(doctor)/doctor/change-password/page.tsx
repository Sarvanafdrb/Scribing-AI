"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ChangePasswordForm } from "@/app/(admin)/settings/components/ChangePasswordForm";

export default function DoctorChangePasswordPage() {
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
          <h1 className="text-2xl font-semibold text-gray-900">
            Change Password
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Update your account password to keep your workspace secure.
          </p>
        </div>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
