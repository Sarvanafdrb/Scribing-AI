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

export function DoctorTopBar() {
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
    <>
      <ActiveRecordingBanner />
      <header className="glass w-full overflow-x-hidden border-b border-border/50">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
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
    </>
  );
}
