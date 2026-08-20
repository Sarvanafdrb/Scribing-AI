"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { getUserOrganizationName } from "@/types/auth.types";
import { UserProfileDropdown } from "@/components/shared/UserProfileDropdown";
import { WorkspaceSwitcher } from "@/components/shared/WorkspaceSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { DoctorNav } from "@/components/doctor/DoctorNav";
import { ActiveRecordingBanner } from "@/components/doctor/ActiveRecordingBanner";
import { useActiveRecordingStore } from "@/store/active-recording.store";
import { useTenantScope } from "@/hooks/useTenantScope";

interface DoctorShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function DoctorShell({ children, title, description, actions }: DoctorShellProps) {
  const { user } = useAuthStore();
  const { organizationName, isSingleOrgStaff } = useTenantScope();
  const isLocallyRecording = useActiveRecordingStore(
    (state) => state.isLocallyRecording,
  );
  const recordingSessionId = useActiveRecordingStore((state) => state.sessionId);

  const orgLabel =
    organizationName || getUserOrganizationName(user) || "Organization";

  const handleNavigate = useCallback(
    (href: string) => {
      if (!isLocallyRecording || !recordingSessionId) {
        return true;
      }
      if (href === `/doctor/workspace/${recordingSessionId}`) {
        return true;
      }
      toast.error(
        "An active recording is in progress. Return to the consultation first.",
      );
      return false;
    },
    [isLocallyRecording, recordingSessionId],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ActiveRecordingBanner />

      <header className="glass border-b border-border/50">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          <div className="hidden min-w-0 shrink-0 sm:block">
            <h1 className="truncate text-base font-bold text-primary lg:text-lg">
              {orgLabel}
            </h1>
          </div>

          <DoctorNav
            className="min-w-0 flex-1 overflow-x-auto"
            onNavigate={handleNavigate}
            inline
          />

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {!isSingleOrgStaff ? <WorkspaceSwitcher compact /> : null}
            {isSingleOrgStaff ? (
              <WorkspaceSwitcher compact className="sm:hidden" />
            ) : null}
            <ThemeToggle />
            <UserProfileDropdown
              profileHref="/doctor/profile"
              changePasswordHref="/doctor/change-password"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {title ? (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
