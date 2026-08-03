"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Edit,
  Mail,
  Shield,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/users/useUser";
import { useAccessControl } from "@/hooks/useAccessControl";
import { LinkCell } from "@/components/shared/LinkCell";

const formatDateTime = (value?: string | Date) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

export default function UserDetailsPage() {
  const { id } = useParams();
  const userId = id as string;
  const { data: user, isLoading } = useUser(userId);
  const { canEditUser } = useAccessControl();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6 text-center">
        <h2 className="text-lg font-semibold">User not found</h2>
        <Link href="/users">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </Link>
      </div>
    );
  }

  const isActive = user.isActive !== false;
  const org =
    typeof user.organizationId === "object" ? user.organizationId : null;
  const orgId = org?.id || org?._id;
  const role = typeof user.roleId === "object" ? user.roleId : null;
  const roleId = role?.id || role?._id;
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const canEdit = canEditUser(user.id || user._id || userId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/users">
        <Button variant="ghost" className="pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{fullName || "User"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={
              isActive
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-blue-100 text-blue-600 hover:bg-blue-200"
            }
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
          {canEdit && isActive && (
            <Link href={`/users/${userId}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-blue-100">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Profile</CardTitle>
            </div>
            <CardDescription>Basic account information</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Full Name</dt>
                <dd className="font-medium">{fullName || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </dt>
                <dd>{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email Verified</dt>
                <dd>{user.isEmailVerified ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-blue-100">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Organization & Role</CardTitle>
            </div>
            <CardDescription>Assignment details</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Organization</dt>
                <dd>
                  {orgId && org?.name ? (
                    <LinkCell href={`/organizations/${orgId}`}>{org.name}</LinkCell>
                  ) : (
                    org?.name || user.organizationName || "—"
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Role
                </dt>
                <dd>
                  {roleId && role?.name ? (
                    <LinkCell href={`/roles/${roleId}`}>{role.name}</LinkCell>
                  ) : (
                    role?.name || "—"
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-blue-100 md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Record</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDateTime(user.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd>{formatDateTime(user.updatedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
                <dt className="text-muted-foreground">Last Login</dt>
                <dd>{formatDateTime(user.lastLogin)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
