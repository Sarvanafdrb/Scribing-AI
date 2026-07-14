"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { isDoctorUser } from "@/types/auth.types";

const PUBLIC_AUTH_PATHS = [
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
  const isPublicAuthPage = PUBLIC_AUTH_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  useEffect(() => {
    if (!isAuthenticated || !isPublicAuthPage) return;
    router.push(isDoctorUser(user) ? "/doctor/workspace" : "/dashboard");
  }, [isAuthenticated, isPublicAuthPage, router, user]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-blue-50 to-blue-100">
      <div className="w-full max-w-md px-4">{children}</div>
    </div>
  );
}
