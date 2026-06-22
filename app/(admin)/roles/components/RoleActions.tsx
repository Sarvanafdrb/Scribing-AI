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
import { useRoleMutations } from "@/hooks/roles/useRoleMutations";
import { Role } from "@/types/role.types";
import { Edit, MoreHorizontal, Power } from "lucide-react";

interface RoleActionsProps {
  role: Role;
  onStatusChange?: () => void;
}

export function RoleActions({ role, onStatusChange }: RoleActionsProps) {
  const router = useRouter();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const { activateRole, deactivateRole } = useRoleMutations();

  const roleId = role.id || role._id || "";
  const isActive = role.isActive !== false;

  const handleStatusToggle = async () => {
    try {
      if (isActive) {
        await deactivateRole.mutateAsync(roleId);
      } else {
        await activateRole.mutateAsync(roleId);
      }
      onStatusChange?.();
      setShowStatusDialog(false);
    } catch {
      // Toast handled in hook
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
          <DropdownMenuItem onClick={() => router.push(`/roles/${roleId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowStatusDialog(true)}
            className={isActive ? "text-red-600 focus:text-red-600" : undefined}
          >
            <Power className="mr-2 h-4 w-4" />
            {isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isActive ? "Deactivate Role" : "Activate Role"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {isActive ? "deactivate" : "activate"}{" "}
              <strong>{role.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={isActive ? "destructive" : "default"}
              className={!isActive ? "bg-blue-600 hover:bg-blue-700" : undefined}
              onClick={handleStatusToggle}
            >
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
