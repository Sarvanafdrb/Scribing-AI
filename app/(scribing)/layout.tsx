"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Mic, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useAuthValidation } from "@/hooks/useAuthValidation";
import { useAutoLogin } from "@/hooks/useAutoLogin";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { useWorkspaceGuard } from "@/hooks/useWorkspaceGuard";
import { AppHeader } from "@/components/shared/AppHeader";

const navItems = [
  { href: "/recording", label: "Recording", icon: Mic },
  { href: "/transcript", label: "Transcript", icon: ScrollText },
  { href: "/notes", label: "Notes", icon: FileText },
];

export default function ScribingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, _hasHydrated, isLoading } = useAuthStore();
  const { isValidating } = useAuthValidation();
  const { shouldShowLoading: workspaceGuardLoading, shouldBlock } =
    useWorkspaceGuard();

  useAutoLogin();
  useSessionExpiry();

  const isAuthenticated = !!token;
  const shouldShowLoading =
    !_hasHydrated || isLoading || isValidating || workspaceGuardLoading;

  useEffect(() => {
    if (!_hasHydrated || isValidating) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [_hasHydrated, isAuthenticated, isValidating, router]);

  if (shouldShowLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-sm text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || shouldBlock) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader subtitle="Clinical Scribing" />
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-end px-4 py-3">
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-700",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
