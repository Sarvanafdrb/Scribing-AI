"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
} from "@/constants/permissions";
import { Permission } from "@/types/permission.types";
import { cn } from "@/lib/utils";
import { Save, ShieldCheck } from "lucide-react";

interface PermissionMatrixProps {
  selectedRoleName?: string;
  isRoleActive?: boolean;
  permissions: Permission[];
  selectedPermissionIds: Set<string>;
  onTogglePermission: (permissionId: string, checked: boolean) => void;
  onToggleModule: (moduleId: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onSave: () => void;
  canEdit: boolean;
  isSaving?: boolean;
  isLoading?: boolean;
  hasChanges: boolean;
}

const getPermissionId = (permission: Permission) =>
  permission.id || permission._id || "";

export function PermissionMatrix({
  selectedRoleName,
  isRoleActive = true,
  permissions,
  selectedPermissionIds,
  onTogglePermission,
  onToggleModule,
  onToggleAll,
  onSave,
  canEdit,
  isSaving,
  isLoading,
  hasChanges,
}: PermissionMatrixProps) {
  const canModifyPermissions = canEdit && isRoleActive;
  const permissionsByModule = PERMISSION_MODULES.map((module) => ({
    module,
    items: PERMISSION_ACTIONS.map((action) => {
      const permission = permissions.find(
        (item) => item.module === module.id && item.action === action.id,
      );
      return { action, permission };
    }),
  }));

  const allPermissionIds = permissions.map(getPermissionId).filter(Boolean);
  const allSelected =
    allPermissionIds.length > 0 &&
    allPermissionIds.every((id) => selectedPermissionIds.has(id));

  const isModuleFullySelected = (moduleId: string) => {
    const modulePermissionIds = permissions
      .filter((permission) => permission.module === moduleId)
      .map(getPermissionId)
      .filter(Boolean);

    return (
      modulePermissionIds.length > 0 &&
      modulePermissionIds.every((id) => selectedPermissionIds.has(id))
    );
  };

  if (!selectedRoleName) {
    return (
      <div className="flex h-full min-h-[480px] items-center justify-center rounded-lg border bg-white shadow-sm">
        <div className="text-center text-muted-foreground">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-blue-300" />
          <p className="font-medium text-slate-700">Select a role</p>
          <p className="mt-1 text-sm">
            Choose a role from the left panel to manage its permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Permission Matrix</h2>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Configure access for{" "}
            <Badge variant="outline" className="capitalize">
              {selectedRoleName}
            </Badge>
            {!isRoleActive && (
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-100 text-slate-600"
              >
                Inactive
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              checked={allSelected}
              disabled={!canModifyPermissions || isLoading}
              onChange={(e) => onToggleAll(e.target.checked)}
            />
            Select All
          </label>
          <Button
            onClick={onSave}
            disabled={
              !canModifyPermissions || isSaving || isLoading || !hasChanges
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Permissions"}
          </Button>
        </div>
      </div>

      {!isRoleActive && (
        <div
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          🔒 This role is inactive. Activate the role to modify its permissions.
        </div>
      )}

      <div
        className={cn(
          "overflow-auto transition-opacity",
          !isRoleActive && "opacity-65",
        )}
        aria-readonly={!isRoleActive || undefined}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100/80 hover:bg-slate-100/80">
              <TableHead className="min-w-[220px] font-bold">Module</TableHead>
              {PERMISSION_ACTIONS.map((action) => (
                <TableHead
                  key={action.id}
                  className="text-center font-bold capitalize"
                >
                  {action.label}
                </TableHead>
              ))}
              <TableHead className="text-center font-bold">All</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissionsByModule.map(({ module, items }) => (
              <TableRow key={module.id}>
                <TableCell className="font-medium text-slate-800">
                  {module.label}
                </TableCell>
                {items.map(({ action, permission }) => {
                  const permissionId = permission
                    ? getPermissionId(permission)
                    : "";
                  const checked = permissionId
                    ? selectedPermissionIds.has(permissionId)
                    : false;

                  return (
                    <TableCell key={action.id} className="text-center">
                      {permission ? (
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          checked={checked}
                          disabled={!canModifyPermissions || isLoading}
                          onChange={(e) =>
                            onTogglePermission(permissionId, e.target.checked)
                          }
                          aria-label={`${module.label} ${action.label}`}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    checked={isModuleFullySelected(module.id)}
                    disabled={!canModifyPermissions || isLoading}
                    onChange={(e) =>
                      onToggleModule(module.id, e.target.checked)
                    }
                    aria-label={`Select all ${module.label} permissions`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
