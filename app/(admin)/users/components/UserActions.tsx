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
import { useUserMutations } from "@/hooks/users/useUserMutations";
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

  const getUserId = (): string => {
    if (user.id) return user.id;
    if (user._id) return user._id;
    return user.email;
  };

  const isActive = user.isActive ?? false;
  const userId = getUserId();

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
          <DropdownMenuItem
            onClick={() => router.push(`/users/${userId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
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
            Deactivate User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
