"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Edit,
  Power,
  Trash2,
  Globe,
  Briefcase,
  Mail,
  Loader2,
  AlertCircle,
  Settings,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/organizations/useOrganization";
import { useOrganizationMutations } from "@/hooks/organizations/useOrganizationMutations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function OrganizationDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const organizationId = id as string;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    data: organization,
    isLoading,
    refetch,
  } = useOrganization(organizationId);
  const { activateOrganization, deactivateOrganization, deleteOrganization } =
    useOrganizationMutations();

  // Helper to get organization ID
  const getOrgId = (): string => {
    if (!organization) return organizationId;
    if (organization.id) return organization.id;
    // @ts-ignore - _id might come from MongoDB
    if (organization._id) return organization._id;
    if (organization.organizationCode) return organization.organizationCode;
    return organizationId;
  };

  // Helper to get status
  const isActive = organization?.isActive !== false;
  const status = isActive ? "active" : "inactive";

  // Helper to format date safely
  const formatDate = (date?: string | Date): string => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  const formatDateTime = (date?: string | Date): string => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleString();
    } catch {
      return "Invalid date";
    }
  };

  const handleStatusToggle = async () => {
    if (!organization) return;

    try {
      const orgId = getOrgId();
      if (isActive) {
        await deactivateOrganization.mutateAsync(orgId);
      } else {
        await activateOrganization.mutateAsync(orgId);
      }
      refetch();
    } catch {
      // Toast handled in mutation hook
    }
  };

  const handleDelete = async () => {
    if (!organization) return;

    try {
      const orgId = getOrgId();
      await deleteOrganization.mutateAsync(orgId);
      setShowDeleteDialog(false);
      router.push("/organizations");
    } catch {
      // Toast handled in mutation hook
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16 mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Details Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-32 mt-1" />
                </div>
              ))}
            </div>
            <div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-full mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not Found State
  if (!organization) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold">
                  Organization Not Found
                </h3>
                <p className="text-sm text-muted-foreground">
                  The organization you're looking for doesn't exist or has been
                  removed.
                </p>
              </div>
              <Link href="/organizations">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Organizations
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orgId = getOrgId();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/organizations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{organization.name}</h1>
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={isActive ? "bg-green-500" : "bg-gray-500"}
              >
                {status}
              </Badge>
            </div>
            {organization.description && (
              <p className="text-sm text-muted-foreground">
                {organization.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isActive ? (
            <Link href={`/organizations/${orgId}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          <Button
            variant={isActive ? "destructive" : "default"}
            onClick={handleStatusToggle}
            disabled={
              activateOrganization.isPending || deactivateOrganization.isPending
            }
          >
            {(activateOrganization.isPending ||
              deactivateOrganization.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Power className="mr-2 h-4 w-4" />
            {isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteOrganization.isPending}
          >
            {deleteOrganization.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate max-w-[200px]">
                  {organization.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm font-medium">
                  {formatDate(organization.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${isActive ? "bg-green-50" : "bg-gray-50"}`}
              >
                <Building2
                  className={`h-5 w-5 ${isActive ? "text-green-600" : "text-gray-600"}`}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p
                  className={`text-sm font-bold ${isActive ? "text-green-600" : "text-gray-600"}`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Detailed information about the organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-muted-foreground">
                Organization Name
              </label>
              <p className="font-medium">{organization.name}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <p className="font-medium">
                {organization.adminEmail ||
                  organization.email ||
                  "Not specified"}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Phone</label>
              <p className="font-medium">
                {organization.contactNumber ||
                  organization.phone ||
                  "Not specified"}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                Subscription Plan
              </label>
              <Badge
                variant={
                  organization.subscriptionPlan === "premium"
                    ? "default"
                    : "secondary"
                }
                className={
                  organization.subscriptionPlan === "premium"
                    ? "bg-purple-500"
                    : organization.subscriptionPlan === "basic"
                      ? "bg-blue-500"
                      : ""
                }
              >
                {organization.subscriptionPlan || "free"}
              </Badge>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                Organization Code
              </label>
              <p className="font-medium">
                {organization.organizationCode || "N/A"}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Industry</label>
              <p className="font-medium">
                {organization.industry || "Not specified"}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Website</label>
              {organization.website ? (
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Globe className="h-4 w-4" />
                  {organization.website}
                </a>
              ) : (
                <p className="font-medium text-muted-foreground">
                  Not specified
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                Organization Size
              </label>
              <p className="font-medium">
                {organization.size || "Not specified"}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                Provider Count
              </label>
              <p className="font-medium">
                {organization.providerCount || "Not specified"}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                Organization Type
              </label>
              <p className="font-medium">
                {organization.organizationType || "Not specified"}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Address</label>
              <p className="font-medium">
                {organization.address || "Not specified"}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                Created At
              </label>
              <p className="font-medium">
                {formatDateTime(organization.createdAt)}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                Last Updated
              </label>
              <p className="font-medium">
                {formatDateTime(organization.updatedAt)}
              </p>
            </div>
          </div>
          {organization.description && (
            <div className="mt-6 pt-6 border-t">
              <label className="text-sm text-muted-foreground">
                Description
              </label>
              <p className="font-medium mt-1">{organization.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`/organizations/${orgId}/users`}>
          <Button variant="outline" className="w-full">
            <Users className="mr-2 h-4 w-4" />
            View Members
          </Button>
        </Link>
        {isActive ? (
          <Link href={`/organizations/${orgId}/edit`}>
            <Button variant="outline" className="w-full">
              <Edit className="mr-2 h-4 w-4" />
              Edit Organization
            </Button>
          </Link>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            <Edit className="mr-2 h-4 w-4" />
            Edit Organization
          </Button>
        )}
        <Link href={`/organizations/${orgId}/settings`}>
          <Button variant="outline" className="w-full">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{organization.name}</strong> and remove all associated
              data including users, settings, and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOrganization.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Organization"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
