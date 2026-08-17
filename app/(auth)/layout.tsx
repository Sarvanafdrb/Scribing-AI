"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { resolveAuthenticatedHomePath } from "@/utils/authRedirect";

/** Auth pages that should bounce authenticated users to their home workspace. */
const REDIRECT_WHEN_AUTHENTICATED_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = !!token;
  const isLoginPage = pathname === "/login";
  const shouldRedirectAuthenticated = REDIRECT_WHEN_AUTHENTICATED_PATHS.some(
    (path) => pathname.startsWith(path),
  );

  useEffect(() => {
    if (!isAuthenticated || !shouldRedirectAuthenticated) return;
    router.push(resolveAuthenticatedHomePath(user, token));
  }, [isAuthenticated, shouldRedirectAuthenticated, router, user, token]);

  if (isLoginPage || pathname.startsWith("/accept-invitation/")) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-[var(--ambient-1)] blur-[90px]" />
        <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[var(--ambient-2)] blur-[90px]" />
      </div>
      <div className="relative z-10 w-full max-w-md px-4">{children}</div>
    </div>
  );
}
