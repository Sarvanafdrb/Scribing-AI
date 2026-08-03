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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
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
      color: "bg-blue-500",
    },
    {
      title: "Total Users",
      value: userCountLoading ? "..." : String(totalUsers),
      icon: Users,
      change: isAllOrganizations ? "Platform-wide" : "Organization scoped",
      color: "bg-blue-600",
    },
    {
      title: "Active Roles",
      value: roleStatsLoading ? "..." : String(roleStats?.activeCount ?? 0),
      icon: Shield,
      change: isAllOrganizations ? "Platform-wide" : "Organization scoped",
      color: "bg-blue-400",
    },
    {
      title: "Active Consultations",
      value: sessionStatsLoading
        ? "..."
        : String(sessionStats?.activeCount || 0),
      icon: Activity,
      change: isAllOrganizations ? "Platform-wide" : "Organization scoped",
      color: "bg-blue-700",
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
            color: "bg-teal-600",
          },
          {
            title: "Total Patients",
            value: patientCountLoading ? "..." : String(totalPatients),
            icon: HeartPulse,
            change: isAllOrganizations
              ? "Platform-wide"
              : "Organization scoped",
            color: "bg-indigo-600",
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
      iconColor: "text-blue-600",
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">
          Welcome back, {user.firstName} {user.lastName}!
        </h1>
        <p className="text-blue-100 mt-1">{scopeLabel}</p>
        <p className="text-blue-100 text-sm mt-2">
          Here&apos;s what&apos;s happening with your scribing platform today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.color} p-2 rounded-full`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 pb-3 border-b last:border-0"
                    >
                      <div className={`${activity.iconColor} mt-1`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
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
            <CardContent className="space-y-3">
              <Link
                href="/organizations/create"
                className="block w-full bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                + Create Organization
              </Link>
              <Link
                href="/users/create"
                className="block w-full bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                + Add New User
              </Link>
              <Link
                href="/roles/create"
                className="block w-full bg-blue-50/80 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                + Create Role
              </Link>
              <Link
                href="/sessions/create"
                className="block w-full bg-white border border-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-left"
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
