// app/(admin)/organizations/components/OrganizationActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useOrganizationMutations } from "@/hooks/organizations/useOrganizationMutations";
import { Organization } from "@/types/organization.types";
import {
  Edit,
  MoreHorizontal,
  Power,
  Settings,
  Trash2,
  Users,
} from "lucide-react";

interface OrganizationActionsProps {
  organization: Organization;
  onStatusChange?: () => void;
}

export function OrganizationActions({
  organization,
  onStatusChange,
}: OrganizationActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { activateOrganization, deactivateOrganization, deleteOrganization } =
    useOrganizationMutations();

  // Helper to get organization ID
  const getOrgId = (): string => {
    if (organization.id) return organization.id;
    // @ts-ignore - _id might come from MongoDB
    if (organization._id) return organization._id;
    // Fallback to organizationCode
    if (organization.organizationCode) return organization.organizationCode;
    // Last resort: use email
    return organization.email;
  };

  // Helper to get status
  const isActive = organization.isActive !== false;

  const handleStatusToggle = async () => {
    try {
      const orgId = getOrgId();
      if (isActive) {
        await deactivateOrganization.mutateAsync(orgId);
      } else {
        await activateOrganization.mutateAsync(orgId);
      }
      onStatusChange?.();
    } catch {
      // Toast handled in mutation hook
    }
  };

  const handleDelete = async () => {
    try {
      const orgId = getOrgId();
      await deleteOrganization.mutateAsync(orgId);
      onStatusChange?.();
      setShowDeleteDialog(false);
    } catch {
      // Toast handled in mutation hook
    }
  };

  const orgId = getOrgId();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => router.push(`/organizations/${orgId}`)}
          >
            <Users className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!isActive}
            onClick={() => {
              if (isActive) router.push(`/organizations/${orgId}/edit`);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/organizations/${orgId}/users`)}
          >
            <Users className="mr-2 h-4 w-4" />
            Manage Users
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/organizations/${orgId}/settings`)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleStatusToggle}>
            <Power className="mr-2 h-4 w-4" />
            {isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{organization.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
