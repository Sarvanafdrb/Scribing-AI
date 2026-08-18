"use client";

import { ReactNode } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useAuthValidation } from "@/hooks/useAuthValidation";
import { hasPermission, isSuperAdminUser } from "@/types/auth.types";
import { AccessDenied } from "@/components/shared/AccessDenied";

interface PermissionGuardProps {
  permission: string | string[];
  requireAll?: boolean;
  children: ReactNode;
  message?: string;
  fallback?: ReactNode;
}

export function PermissionGuard({
  permission,
  requireAll = false,
  children,
  message,
  fallback,
}: PermissionGuardProps) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const { isValidating } = useAuthValidation();

  if (!hasHydrated || isValidating) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  const isSuperAdmin = isSuperAdminUser(user, token);
  const allowed =
    isSuperAdmin ||
    (requireAll
      ? permissions.every((code) => hasPermission(user, code, token))
      : permissions.some((code) => hasPermission(user, code, token)));

  if (!allowed) {
    return fallback ?? <AccessDenied message={message} />;
  }

  return <>{children}</>;
}
