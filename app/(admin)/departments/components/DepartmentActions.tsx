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
import { useDepartmentMutations } from "@/hooks/departments/useDepartmentMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Department, getDepartmentId } from "@/types/department.types";
import { Edit, MoreHorizontal, Power } from "lucide-react";

interface DepartmentActionsProps {
  department: Department;
  onStatusChange?: () => void;
}

export function DepartmentActions({
  department,
  onStatusChange,
}: DepartmentActionsProps) {
  const router = useRouter();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const { activateDepartment, deactivateDepartment } = useDepartmentMutations();
  const { canEditDepartment, canDeactivateDepartment } = useAccessControl();

  const departmentId = getDepartmentId(department);
  const isActive = department.isActive !== false;
  const canEdit = canEditDepartment();
  const canToggleStatus = canDeactivateDepartment() || canEdit;

  if (!canEdit && !canToggleStatus) {
    return null;
  }

  const handleStatusToggle = async () => {
    try {
      if (isActive) {
        await deactivateDepartment.mutateAsync(departmentId);
      } else {
        await activateDepartment.mutateAsync(departmentId);
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
          {canEdit && (
            <DropdownMenuItem
              disabled={!isActive}
              onClick={() => {
                if (isActive) router.push(`/departments/edit/${departmentId}`);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {canToggleStatus && (
            <>
              {canEdit && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setShowStatusDialog(true)}
                className={isActive ? "text-red-600 focus:text-red-600" : undefined}
              >
                <Power className="mr-2 h-4 w-4" />
                {isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isActive ? "Deactivate Department?" : "Activate Department?"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {isActive ? "deactivate" : "activate"}{" "}
              <strong>{department.name}</strong>?
              {isActive
                ? " Existing user assignments will not be changed."
                : ""}
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
