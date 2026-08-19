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
}

export function DoctorShell({ children, title, description }: DoctorShellProps) {
  const { user } = useAuthStore();
  const { organizationName } = useTenantScope();
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
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-primary">
                {orgLabel}
              </h1>
              <p className="text-xs text-muted-foreground">Doctor Home</p>
            </div>
            <div className="flex items-center gap-2">
              <WorkspaceSwitcher />
              <ThemeToggle />
              <UserProfileDropdown
                profileHref="/doctor/profile"
                changePasswordHref="/doctor/change-password"
              />
            </div>
          </div>

          <DoctorNav onNavigate={handleNavigate} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {title ? (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
