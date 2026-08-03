"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Edit, Shield } from "lucide-react";
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
import { useRole } from "@/hooks/roles/useRole";

const formatDateTime = (value?: string | Date) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

export default function RoleDetailsPage() {
  const { id } = useParams();
  const roleId = id as string;
  const { data: role, isLoading } = useRole(roleId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6 text-center">
        <h2 className="text-lg font-semibold">Role not found</h2>
        <Link href="/roles">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
          </Button>
        </Link>
      </div>
    );
  }

  const isActive = role.isActive !== false;
  const resolvedId = role.id || role._id || roleId;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/roles">
        <Button variant="ghost" className="pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roles
        </Button>
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{role.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role.description || "No description"}
          </p>
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
          {isActive && (
            <Link href={`/roles/${resolvedId}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit Role
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="border-blue-100">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Role Details</CardTitle>
          </div>
          <CardDescription>Permissions and assignment metadata</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{role.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="max-w-[320px] text-right">
                {role.description || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Organization ID</dt>
              <dd className="font-mono text-xs">
                {role.organizationId || "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="border-blue-100">
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
              <dd>{formatDateTime(role.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:flex-col sm:gap-1">
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd>{formatDateTime(role.updatedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
