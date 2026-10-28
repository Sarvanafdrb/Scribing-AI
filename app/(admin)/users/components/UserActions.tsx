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
import { useUserMutations } from "@/hooks/users/useUserMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { User } from "@/types/user.types";
import { Edit, MoreHorizontal, Power, Trash2 } from "lucide-react";

interface UserActionsProps {
  user: User;
  onStatusChange?: () => void;
}

export function UserActions({ user, onStatusChange }: UserActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { activateUser, deactivateUser, deleteUser } = useUserMutations();
  const { canEditUser, canManageUserStatus, canDeleteUser } =
    useAccessControl();

  const getUserId = (): string => {
    if (user.id) return user.id;
    if (user._id) return user._id;
    return user.email;
  };

  const isActive = user.isActive !== false;
  const userId = getUserId();
  const canEdit = canEditUser(userId);
  const canToggleStatus = canManageUserStatus(userId);
  const canDelete = canDeleteUser(userId);

  if (!canEdit && !canToggleStatus && !canDelete) {
    return null;
  }

  const handleStatusToggle = async () => {
    try {
      if (isActive) {
        await deactivateUser.mutateAsync(userId);
      } else {
        await activateUser.mutateAsync(userId);
      }
      onStatusChange?.();
    } catch {
      // Toast handled in mutation hook
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser.mutateAsync(userId);
      onStatusChange?.();
      setShowDeleteDialog(false);
    } catch {
      // Toast handled in mutation hook
    }
  };

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
          {canEdit && (
            <DropdownMenuItem
              disabled={!isActive}
              onClick={() => {
                if (isActive) router.push(`/users/edit/${userId}`);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {canToggleStatus && (
            <>
              {canEdit && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={handleStatusToggle}>
                <Power className="mr-2 h-4 w-4" />
                {isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
