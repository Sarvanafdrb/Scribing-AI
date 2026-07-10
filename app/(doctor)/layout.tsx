"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useAuthValidation } from "@/hooks/useAuthValidation";
import { useAutoLogin } from "@/hooks/useAutoLogin";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { useWorkspaceGuard } from "@/hooks/useWorkspaceGuard";
import { useWorkspaceBootstrap } from "@/hooks/useWorkspaceBootstrap";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, _hasHydrated, isLoading } = useAuthStore();
  const router = useRouter();
  const { isValidating } = useAuthValidation();
  const { shouldShowLoading: workspaceGuardLoading, shouldBlock } =
    useWorkspaceGuard();
  useWorkspaceBootstrap();

  useAutoLogin();
  useSessionExpiry();

  const shouldShowLoading =
    !_hasHydrated || isLoading || isValidating || workspaceGuardLoading;

  useEffect(() => {
    if (!_hasHydrated || isLoading || isValidating) return;
    if (!token) {
      router.replace("/login");
    }
  }, [_hasHydrated, isLoading, isValidating, token, router]);

  if (shouldShowLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!token || shouldBlock) {
    return null;
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
