// app/(admin)/organizations/[id]/settings/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Power,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationMutations } from "@/hooks/organizations/useOrganizationMutations";
import { useOrganization } from "@/hooks/organizations/useOrganization";
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
import { useAccessControl } from "@/hooks/useAccessControl";

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { id } = useParams();
  const organizationId = id as string;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { canEditOrganization, canDeleteOrganization } = useAccessControl();

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
  const isActive = organization?.isActive ?? false;

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
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48 mt-1" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader className="bg-destructive/5">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48 mt-1" />
              </div>
              <Skeleton className="h-10 w-40" />
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
  const canEdit = canEditOrganization();
  const canDelete = canDeleteOrganization();

  if (!canEdit && !canDelete) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You do not have permission to manage organization settings.
        </p>
        <Link href={`/organizations/${orgId}`} className="mt-4 inline-block">
          <Button variant="outline">Back to Organization</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/organizations/${orgId}`}>
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
      </div>

      {/* Status Management */}
      {canEdit && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            Status Management
          </CardTitle>
          <CardDescription>
            Activate or deactivate this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Status</p>
              <p className="text-sm text-muted-foreground">
                Organization is currently{" "}
                <span
                  className={
                    isActive
                      ? "text-green-600 font-medium"
                      : "text-gray-500 font-medium"
                  }
                >
                  {isActive ? "active" : "inactive"}
                </span>
              </p>
            </div>
            <Button
              variant={isActive ? "destructive" : "default"}
              onClick={handleStatusToggle}
              disabled={
                activateOrganization.isPending ||
                deactivateOrganization.isPending
              }
            >
              {(activateOrganization.isPending ||
                deactivateOrganization.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {canDelete && (
      <Card className="border-destructive/20">
        <CardHeader className="bg-destructive/5">
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-destructive/70">
            These actions are irreversible. Please proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Organization</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete <strong>{organization.name}</strong> and all
                its data
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteOrganization.isPending}
            >
              {deleteOrganization.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Organization
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

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
