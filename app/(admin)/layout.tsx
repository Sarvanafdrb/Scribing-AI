"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuthValidation } from "@/hooks/useAuthValidation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Mic,
  Settings,
  KeyRound,
  LogOut,
  Menu,
  X,
  HeartPulse,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccessControl } from "@/hooks/useAccessControl";
import { hasPermission, isDoctorUser } from "@/types/auth.types";
import { useAutoLogin } from "@/hooks/useAutoLogin";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { useWorkspaceGuard } from "@/hooks/useWorkspaceGuard";
import { AppHeader } from "@/components/shared/AppHeader";
import { NotificationBell } from "@/components/shared/NotificationBell";

const menuItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "USER_VIEW",
  },
  {
    path: "/organizations",
    label: "Organizations",
    icon: Building2,
    permission: "ORGANIZATION_VIEW",
  },
  {
    path: "/users",
    label: "Users",
    icon: Users,
    permission: "USER_VIEW",
  },
  {
    path: "/reports",
    label: "Reports",
    icon: BarChart3,
    permission: "REPORT_VIEW",
  },
  {
    path: "/patients",
    label: "Patients",
    icon: HeartPulse,
    permission: "PATIENT_VIEW",
  },
  {
    path: "/roles",
    label: "Roles",
    icon: Shield,
    permission: "ROLE_VIEW",
  },
  {
    path: "/permissions",
    label: "Permissions",
    icon: KeyRound,
    permission: "PERMISSION_VIEW",
  },
  {
    path: "/sessions",
    label: "Consultation",
    icon: Mic,
    permission: "SESSION_VIEW",
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    permission: "SETTINGS_VIEW",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, isLoading, _hasHydrated, logout } = useAuthStore();
  const { isSuperAdmin } = useAccessControl();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isValidating } = useAuthValidation();
  const { shouldShowLoading: workspaceGuardLoading, shouldBlock } =
    useWorkspaceGuard();
  const isAuthenticated = !!token;
  const shouldShowLoading =
    !_hasHydrated || isLoading || isValidating || workspaceGuardLoading;
  useAutoLogin();
  useSessionExpiry();
  // Add detailed logging
  useEffect(() => {
    console.log("🔐 AdminLayout Debug:", {
      _hasHydrated,
      isLoading,
      isValidating,
      hasToken: !!token,
      hasUser: !!user,
      isAuthenticated,
      shouldShowLoading,
      pathname,
    });
  }, [
    _hasHydrated,
    isLoading,
    isValidating,
    token,
    user,
    isAuthenticated,
    shouldShowLoading,
    pathname,
  ]);

  useEffect(() => {
    if (!_hasHydrated) {
      console.log("⏳ Waiting for hydration...");
      return;
    }
    if (isValidating) {
      console.log("⏳ Validating session...");
      return;
    }
    if (!isAuthenticated) {
      console.log("🔐 No token, redirecting to login");
      router.replace("/login");
      return;
    }

    if (isDoctorUser(user)) {
      router.replace("/doctor/workspace");
    }
  }, [isAuthenticated, _hasHydrated, isValidating, router, user]);
  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isPreviewPage = /\/sessions\/[^/]+\/preview$/.test(pathname);

  if (shouldShowLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || shouldBlock) {
    return null;
  }
  if (!user || isDoctorUser(user)) {
    return null;
  }
  return (
    <div className="min-h-screen bg-transparent">
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`glass fixed top-0 left-0 z-40 h-screen w-64 border-r border-sidebar-border transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-sidebar-border p-4">
            <h1 className="bg-gradient-to-r from-primary to-[var(--glow)] bg-clip-text text-xl font-bold text-transparent">
              Scribblr AI
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">Admin Panel</p>
          </div>

          {/* User Info */}
          <div className="border-b border-sidebar-border bg-sidebar-accent/50 p-4">
            <p className="font-medium text-foreground">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{user?.email}</p>
            {isSuperAdmin ? (
              <p className="mt-1 text-xs font-medium text-primary">
                Super Admin
              </p>
            ) : (
              user?.organizationName && (
                <p className="mt-1 text-xs text-primary">
                  {user.organizationName}
                </p>
              )
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {menuItems
              .filter((item) => {
                if (item.path === "/settings") {
                  return true;
                }
                return hasPermission(user, item.permission);
              })
              .map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.path ||
                  pathname.startsWith(`${item.path}/`);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-full px-3 py-2 transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-glow"
                        : "text-sidebar-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </nav>

          {/* Logout Button */}
          <div className="border-t border-sidebar-border p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {!isPreviewPage && pathname !== "/access-not-assigned" && (
          <AppHeader subtitle="Admin Panel">
            <NotificationBell />
          </AppHeader>
        )}
        <div className={isPreviewPage ? "" : "p-6"}>{children}</div>
      </main>
    </div>
  );
}
