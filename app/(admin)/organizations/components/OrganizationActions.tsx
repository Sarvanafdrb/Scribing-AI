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
import { useAccessControl } from "@/hooks/useAccessControl";
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
  const {
    canEditOrganization,
    canDeleteOrganization,
    canCreateUser,
    canViewUsers,
  } = useAccessControl();

  const getOrgId = (): string => {
    if (organization.id) return organization.id;
    if (organization._id) return organization._id;
    if (organization.organizationCode) return organization.organizationCode;
    return organization.email;
  };

  const isActive = organization.isActive !== false;
  const orgId = getOrgId();
  const canEdit = canEditOrganization();
  const canDelete = canDeleteOrganization();
  const canManageMembers = canCreateUser() && canViewUsers();
  const hasAnyAction = canEdit || canDelete || canManageMembers;

  const handleStatusToggle = async () => {
    try {
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
      await deleteOrganization.mutateAsync(orgId);
      onStatusChange?.();
      setShowDeleteDialog(false);
    } catch {
      // Toast handled in mutation hook
    }
  };

  if (!hasAnyAction) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-muted-foreground"
        onClick={() => router.push(`/organizations/${orgId}`)}
      >
        View
      </Button>
    );
  }

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
          {canEdit && (
            <DropdownMenuItem
              disabled={!isActive}
              onClick={() => {
                if (isActive) router.push(`/organizations/edit/${orgId}`);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {canManageMembers && (
            <DropdownMenuItem
              onClick={() => router.push(`/organizations/users/${orgId}`)}
            >
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem
              onClick={() => router.push(`/organizations/settings/${orgId}`)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          )}
          {canEdit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleStatusToggle}>
                <Power className="mr-2 h-4 w-4" />
                {isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
            </>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
