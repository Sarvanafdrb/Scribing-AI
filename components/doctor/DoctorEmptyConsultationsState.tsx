"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Info, Loader2, LogOut, Plus, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { UserProfileDropdown } from "@/components/shared/UserProfileDropdown";
import { CreatePatientDialog } from "@/components/doctor/CreatePatientDialog";
import { getUserOrganizationName } from "@/types/auth.types";
import { resolveUploadUrl } from "@/utils/media-url.utils";
import { cn } from "@/lib/utils";

interface DoctorEmptyConsultationsStateProps {
  onRefresh: () => Promise<boolean>;
  isRefreshing?: boolean;
}

export function DoctorEmptyConsultationsState({
  onRefresh,
  isRefreshing = false,
}: DoctorEmptyConsultationsStateProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);

  const organizationName = getUserOrganizationName(user) || "Organization";
  const organizationLogo = resolveUploadUrl(user?.organization?.logo);
  const doctorName = user
    ? `Dr. ${user.firstName} ${user.lastName}`.trim()
    : "Doctor";
  const currentYear = new Date().getFullYear();

  const handleRefresh = async () => {
    const hasSessions = await onRefresh();
    if (!hasSessions) {
      toast.info("No new consultations assigned.");
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {organizationLogo ? (
            <img
              src={organizationLogo}
              alt={`${organizationName} logo`}
              className="h-10 w-10 shrink-0 rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-lg font-bold text-white">
              +
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-teal-700 sm:text-xl">
              {organizationName}
            </h1>
            <p className="text-xs text-gray-500">AI Medical Scribe</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-gray-800">{doctorName}</p>
            <p className="text-xs text-gray-500">Doctor</p>
          </div>
          <UserProfileDropdown
            avatarClassName="h-10 w-10 text-sm"
            className="shrink-0"
          />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="flex w-full max-w-xl flex-col items-center text-center">
          <div className="relative mb-6 w-full max-w-md">
            <Image
              src="/images/doctor-empty-illustration.png"
              alt="Doctor with completed calendar — no consultations today"
              width={800}
              height={600}
              priority
              className="mx-auto h-auto w-full object-contain"
            />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
            No Consultations Scheduled Today
          </h2>
          <p className="mt-2 text-base font-semibold text-teal-600 sm:text-lg">
            You&apos;re all caught up!
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            There are no consultation sessions assigned to you today. New
            sessions assigned by your administrator will automatically appear
            here.
          </p>

          <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/80 px-4 py-3.5 text-left transition-colors",
                "hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {isRefreshing ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-teal-600" />
              ) : (
                <RefreshCw className="h-5 w-5 shrink-0 text-teal-600" />
              )}
              <span>
                <span className="block text-sm font-semibold text-teal-800">
                  Refresh
                </span>
                <span className="block text-xs text-teal-600/80">
                  Check for new sessions
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3.5 text-left transition-colors hover:bg-red-50"
            >
              <LogOut className="h-5 w-5 shrink-0 text-red-500" />
              <span>
                <span className="block text-sm font-semibold text-red-700">
                  Logout
                </span>
                <span className="block text-xs text-red-500/80">
                  Sign out of your account
                </span>
              </span>
            </button>
          </div>

          <div className="mt-8 flex w-full max-w-lg items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3.5 text-left">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <p className="text-sm leading-relaxed text-blue-800/80">
              Note: Sessions created and assigned to you by the administrator
              will appear here.
            </p>
          </div>
        </div>
      </main>

      <footer className="flex items-center justify-between gap-4 border-t border-gray-100 px-5 py-4 sm:px-8">
        <button
          type="button"
          onClick={() => setIsCreatePatientOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Patient
        </button>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-xs text-gray-400">
            <Shield className="h-3.5 w-3.5" />
            <span>Secure · Private · HIPAA Compliant</span>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            © {currentYear} {organizationName}. All rights reserved.
          </p>
        </div>
      </footer>

      <CreatePatientDialog
        open={isCreatePatientOpen}
        onOpenChange={setIsCreatePatientOpen}
        onCreated={() => {
          void queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey.includes("doctor-queue"),
          });
          void onRefresh();
        }}
      />
    </div>
  );
}
