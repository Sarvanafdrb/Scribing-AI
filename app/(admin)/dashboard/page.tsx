"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useOrganizations } from "@/hooks/organizations/useOrganizations";
import { useUsers } from "@/hooks/users/useUsers";
import { useSessionStats } from "@/hooks/sessions/useSessions";
import { useRoleStats } from "@/hooks/roles/useRoles";
import { usePatients } from "@/hooks/patients/usePatients";
import { useTotalDoctorsReport } from "@/hooks/reports/useReports";
import { useTenantScope } from "@/hooks/useTenantScope";
import {
  Building2,
  Users,
  Shield,
  Activity,
  CheckCircle,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { organizationId, organizationName, isAllOrganizations, isSuperAdmin } =
    useTenantScope();
  const { total: totalOrganizations, isLoading: orgCountLoading } =
    useOrganizations({ page: 1, limit: 1 });
  const { total: totalUsers, isLoading: userCountLoading } = useUsers({
    page: 1,
    limit: 1,
  });
  const { data: sessionStats, isLoading: sessionStatsLoading } =
    useSessionStats();
  const { data: roleStats, isLoading: roleStatsLoading } = useRoleStats();
  const { total: totalPatients, isLoading: patientCountLoading } = usePatients({
    page: 1,
    limit: 1,
  });
  const { data: doctorsReport, isLoading: doctorsLoading } =
    useTotalDoctorsReport(isSuperAdmin);

  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  const organizationCount = organizationId ? 1 : totalOrganizations;

  const stats = [
    {
      title: "Total Organizations",
      value:
        orgCountLoading && !organizationId ? "..." : String(organizationCount),
      icon: Building2,
      change: isAllOrganizations
        ? "All organizations"
        : "Selected organization",
      color: "bg-indigo-500/80",
    },
    {
      title: "Total Users",
      value: userCountLoading ? "..." : String(totalUsers),
      icon: Users,
      change: isAllOrganizations ? "Platform-wide" : "Organization scoped",
      color: "bg-violet-500/80",
    },
    {
      title: "Active Roles",
      value: roleStatsLoading ? "..." : String(roleStats?.activeCount ?? 0),
      icon: Shield,
      change: isAllOrganizations ? "Platform-wide" : "Organization scoped",
      color: "bg-indigo-400/80",
    },
    {
      title: "Active Consultations",
      value: sessionStatsLoading
        ? "..."
        : String(sessionStats?.activeCount || 0),
      icon: Activity,
      change: isAllOrganizations ? "Platform-wide" : "Organization scoped",
      color: "bg-teal-500/80",
    },
    ...(isSuperAdmin
      ? [
          {
            title: "Total Doctors",
            value: doctorsLoading
              ? "..."
              : String(doctorsReport?.totalDoctors ?? 0),
            icon: Stethoscope,
            change: isAllOrganizations
              ? "Platform-wide"
              : "Organization scoped",
            color: "bg-teal-600/80",
          },
          {
            title: "Total Patients",
            value: patientCountLoading ? "..." : String(totalPatients),
            icon: HeartPulse,
            change: isAllOrganizations
              ? "Platform-wide"
              : "Organization scoped",
            color: "bg-violet-600/80",
          },
        ]
      : []),
  ];

  const recentActivities = [
    {
      id: 1,
      title: "Welcome to Scribing AI",
      description: "Start exploring the platform",
      time: "Just now",
      icon: CheckCircle,
      iconColor: "text-primary",
    },
  ];

  const scopeLabel = isSuperAdmin
    ? isAllOrganizations
      ? "All Organizations"
      : organizationName || "Selected Organization"
    : user.organizationName
      ? `Organization: ${user.organizationName}`
      : "Dashboard";

  return (
    <div className="space-y-6">
      <div className="glass-tint rounded-3xl p-6 text-foreground">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Welcome back, {user.firstName} {user.lastName}!
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          {scopeLabel}
        </p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Here&apos;s what&apos;s happening with your scribing platform today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="transition-shadow hover:shadow-glow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.color} rounded-full p-2`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="glass-row flex items-start gap-3 px-3 py-3"
                    >
                      <div className={`${activity.iconColor} mt-1`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/organizations/create"
                className="glass-row block w-full px-4 py-2.5 text-left text-sm text-foreground"
              >
                + Create Organization
              </Link>
              <Link
                href="/users/create"
                className="glass-row block w-full px-4 py-2.5 text-left text-sm text-foreground"
              >
                + Add New User
              </Link>
              <Link
                href="/roles/create"
                className="glass-row block w-full px-4 py-2.5 text-left text-sm text-foreground"
              >
                + Create Role
              </Link>
              <Link
                href="/sessions/create"
                className="glass-row block w-full px-4 py-2.5 text-left text-sm text-primary"
              >
                + Start New Consultation
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
