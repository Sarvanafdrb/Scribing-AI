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
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoLogin } from "@/hooks/useAutoLogin";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/organizations", label: "Organizations", icon: Building2 },
  { path: "/users", label: "Users", icon: Users },
  { path: "/roles", label: "Roles", icon: Shield },
  { path: "/sessions", label: "Sessions", icon: Mic },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, isLoading, _hasHydrated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isValidating } = useAuthValidation();
  const isAuthenticated = !!token;
  const shouldShowLoading = !_hasHydrated || isLoading || isValidating;
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
    } else {
      console.log("✅ Authenticated, showing dashboard");
    }
  }, [isAuthenticated, _hasHydrated, isValidating, router]);
  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (shouldShowLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }
  if (!user) {
    return null;
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
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
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Scribing AI
            </h1>
            <p className="text-xs text-gray-500 mt-1">Admin Panel</p>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <p className="font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
            {user?.organizationName && (
              <p className="text-xs text-blue-600 mt-1">
                {user?.organizationName}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
