"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Edit,
  Loader2,
  Power,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useOrganization } from "@/hooks/organizations/useOrganization";
import { useOrganizationMutations } from "@/hooks/organizations/useOrganizationMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { OrganizationDetailsTab } from "../components/OrganizationDetailsTab";
import { OrganizationRelatedTab } from "../components/OrganizationRelatedTab";
import type { UpdateOrganizationData } from "@/types/organization.types";
import { cn } from "@/lib/utils";

type OrgTab = "details" | "related";

export default function OrganizationDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const organizationId = id as string;
  const [activeTab, setActiveTab] = useState<OrgTab>("details");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    canEditOrganization,
    canDeleteOrganization,
    canViewOrganizations,
  } = useAccessControl();

  const { data: organization, isLoading } = useOrganization(organizationId);
  const {
    updateOrganization,
    activateOrganization,
    deactivateOrganization,
    deleteOrganization,
  } = useOrganizationMutations();

  const getOrgId = (): string => {
    if (!organization) return organizationId;
    if (organization.id) return organization.id;
    if (organization._id) return organization._id;
    if (organization.organizationCode) return organization.organizationCode;
    return organizationId;
  };

  const isActive = organization?.isActive !== false;
  const canEdit = canEditOrganization();
  const canDelete = canDeleteOrganization();

  const handleStatusToggle = async () => {
    if (!organization) return;
    const orgId = getOrgId();
    try {
      if (isActive) {
        await deactivateOrganization.mutateAsync(orgId);
      } else {
        await activateOrganization.mutateAsync(orgId);
      }
    } catch {
      // Toast handled in mutation hook
    }
  };

  const handleDelete = async () => {
    if (!organization) return;
    try {
      await deleteOrganization.mutateAsync(getOrgId());
      setShowDeleteDialog(false);
      router.push("/organizations");
    } catch {
      // Toast handled in mutation hook
    }
  };

  const handleInlineUpdate = async (data: UpdateOrganizationData) => {
    await updateOrganization.mutateAsync({
      id: getOrgId(),
      data,
    });
  };

  if (!canViewOrganizations()) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view organizations.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-10 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold">Organization Not Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          The organization you&apos;re looking for doesn&apos;t exist or has
          been removed.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/organizations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Organizations
          </Link>
        </Button>
      </div>
    );
  }

  const orgId = getOrgId();

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/organizations"
          className="hover:text-foreground hover:underline"
        >
          Organizations
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{organization.name}</span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {organization.name}
            </h1>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={isActive ? "bg-primary" : undefined}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground sm:text-sm">
            Organization ID: {organization.organizationCode || orgId}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            isActive ? (
              <Button asChild variant="outline" className="rounded-full">
                <Link href={`/organizations/edit/${orgId}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            ) : (
              <Button variant="outline" className="rounded-full" disabled>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )
          ) : null}

          {canEdit ? (
            <Button
              variant={isActive ? "destructive" : "default"}
              className="rounded-full"
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
              <Power className="mr-2 h-4 w-4" />
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          ) : null}

          {canDelete ? (
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteOrganization.isPending}
            >
              {deleteOrganization.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-border/60">
        <nav className="flex gap-1" aria-label="Organization sections">
          {(
            [
              { key: "details", label: "Details" },
              { key: "related", label: "Related" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "details" ? (
        <OrganizationDetailsTab
          organization={organization}
          organizationId={orgId}
          canEdit={canEdit && isActive}
          onUpdateField={handleInlineUpdate}
        />
      ) : (
        <OrganizationRelatedTab organizationId={orgId} />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{organization.name}</strong> and remove associated data.
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
