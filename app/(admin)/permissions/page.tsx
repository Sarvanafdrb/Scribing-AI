"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { RoleListPanel } from "./components/RoleListPanel";
import { PermissionMatrix } from "./components/PermissionMatrix";
import { permissionService } from "@/services/permission.service";
import { roleService } from "@/services/role.service";
import { roleKeys } from "@/services/role.queries";
import { useOrganizations } from "@/hooks/organizations/useOrganizations";
import { useTenantScope } from "@/hooks/useTenantScope";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Permission } from "@/types/permission.types";
import {
  ROLE_EDIT,
  PERMISSION_VIEW,
  PERMISSION_EDIT,
} from "@/constants/permissions";
import { hasPermission } from "@/types/auth.types";
import { useAuthStore } from "@/store/auth.store";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { UnsavedChangesDialog } from "@/components/shared/UnsavedChangesDialog";

const getPermissionId = (permission: Permission) =>
  permission.id || permission._id || "";

export default function PermissionsPage() {
  const queryClient = useQueryClient();
  const { user, token } = useAuthStore();
  const {
    isSuperAdmin,
    canManageAllOrganizations,
    organizationId: scopedOrgId,
  } = useTenantScope();
  const { hasPermission: checkPermission } = useAccessControl();

  const [organizationId, setOrganizationId] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<
    Set<string>
  >(new Set());
  const [initialPermissionIds, setInitialPermissionIds] = useState<Set<string>>(
    new Set(),
  );

  const { organizations, isLoading: orgsLoading } = useOrganizations({
    page: 1,
    limit: 100,
  });

  const firstOrganizationId =
    organizations[0]?.id || organizations[0]?._id || "";

  const canView =
    checkPermission(PERMISSION_VIEW) || checkPermission("permission:read");
  const canEdit =
    canManageAllOrganizations ||
    checkPermission(ROLE_EDIT) ||
    checkPermission("role:update") ||
    checkPermission(PERMISSION_EDIT);

  useEffect(() => {
    const defaultOrgId =
      scopedOrgId || (isSuperAdmin ? firstOrganizationId : "");

    if (defaultOrgId && defaultOrgId !== organizationId) {
      setOrganizationId(defaultOrgId);
    }
  }, [organizationId, scopedOrgId, isSuperAdmin, firstOrganizationId]);

  const { data: matrix, isLoading: matrixLoading } = useQuery({
    queryKey: ["permissions", "matrix"],
    queryFn: () => permissionService.getMatrix(),
    enabled: canView,
  });

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: roleKeys.permissionsPage(organizationId),
    queryFn: () => roleService.getAll(organizationId),
    enabled: !!organizationId && canView,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: rolePermissions, isLoading: rolePermissionsLoading } = useQuery(
    {
      queryKey: roleKeys.rolePermissions(selectedRoleId),
      queryFn: () => roleService.getPermissions(selectedRoleId),
      enabled: !!selectedRoleId,
    },
  );

  // useEffect(() => {
  //   if (!selectedRoleId) {
  //     setSelectedPermissionIds((current) =>
  //       current.size === 0 ? current : new Set(),
  //     );
  //     return;
  //   }

  //   if (!rolePermissions) return;

  //   const ids = new Set(
  //     (rolePermissions as Permission[]).map((permission) =>
  //       getPermissionId(permission),
  //     ),
  //   );

  //   setSelectedPermissionIds((current) =>
  //     setsEqual(current, ids) ? current : ids,
  //   );
  // }, [rolePermissions, selectedRoleId]);
  useEffect(() => {
    if (!selectedRoleId || !rolePermissions) return;

    const ids = new Set(
      rolePermissions.permissions.map((permission) =>
        getPermissionId(permission),
      ),
    );

    setSelectedPermissionIds(ids);
    setInitialPermissionIds(new Set(ids));
  }, [rolePermissions, selectedRoleId]);
  const roleList = roles ?? [];

  const selectedRole = useMemo(
    () => roleList.find((role) => (role.id || role._id) === selectedRoleId),
    [roleList, selectedRoleId],
  );

  const allPermissions = matrix?.permissions || [];

  const saveMutation = useMutation({
    mutationFn: (permissionIds: string[]) =>
      roleService.assignPermissions(selectedRoleId, permissionIds),
    onSuccess: (data) => {
      setInitialPermissionIds(new Set(selectedPermissionIds));

      queryClient.setQueryData(
        roleKeys.rolePermissions(selectedRoleId),
        data,
      );
      toast.success("Permissions saved successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to save permissions",
      );
    },
  });

  const togglePermission = (permissionId: string, checked: boolean) => {
    setSelectedPermissionIds((current) => {
      const next = new Set(current);
      if (checked) next.add(permissionId);
      else next.delete(permissionId);
      return next;
    });
  };

  const toggleModule = (moduleId: string, checked: boolean) => {
    const modulePermissionIds = allPermissions
      .filter((permission) => permission.module === moduleId)
      .map(getPermissionId)
      .filter(Boolean);

    setSelectedPermissionIds((current) => {
      const next = new Set(current);
      modulePermissionIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };
  const isDirty = useMemo(() => {
    if (selectedPermissionIds.size !== initialPermissionIds.size) {
      return true;
    }

    return [...selectedPermissionIds].some(
      (id) => !initialPermissionIds.has(id),
    );
  }, [selectedPermissionIds, initialPermissionIds]);

  const {
    dialogOpen,
    confirmAction,
    handleStay,
    handleDiscard,
    handleDialogOpenChange,
  } = useUnsavedChangesGuard(isDirty);

  const handleSelectRole = (roleId: string) => {
    if (roleId === selectedRoleId) return;
    confirmAction(() => setSelectedRoleId(roleId));
  };

  const handleOrganizationChange = (value: string) => {
    if (value === organizationId) return;
    confirmAction(() => {
      setOrganizationId(value);
      setSelectedRoleId("");
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedPermissionIds(
        new Set(allPermissions.map(getPermissionId).filter(Boolean)),
      );
      return;
    }
    setSelectedPermissionIds(new Set());
  };

  const handleSave = () => {
    if (!selectedRoleId) {
      toast.error("Select a role first");
      return;
    }
    if (selectedRole?.isActive === false) {
      toast.error("Activate the role before modifying its permissions");
      return;
    }
    saveMutation.mutate(Array.from(selectedPermissionIds));
  };

  const isSelectedRoleActive = selectedRole
    ? selectedRole.isActive !== false
    : true;

  if (!canView && !hasPermission(user, PERMISSION_VIEW, token)) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              Permissions
            </h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            Assign module permissions to roles. Users inherit permissions
            through their assigned role.
          </p>
        </div>
      </div>

      {isSuperAdmin && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex max-w-md flex-col gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Organization
              </label>
              <Select
                value={organizationId || undefined}
                onValueChange={handleOrganizationChange}
                disabled={orgsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => {
                    const id = org.id || org._id || "";
                    return (
                      <SelectItem key={id} value={id}>
                        {org.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid min-h-[640px] grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <RoleListPanel
            roles={roleList}
            selectedRoleId={selectedRoleId}
            onSelectRole={handleSelectRole}
            search={roleSearch}
            onSearchChange={setRoleSearch}
            isLoading={rolesLoading || !organizationId}
          />
        </div>
        <div className="lg:col-span-8">
          <PermissionMatrix
            selectedRoleName={selectedRole?.name}
            isRoleActive={isSelectedRoleActive}
            permissionsUpdatedBy={rolePermissions?.updatedBy}
            permissionsUpdatedAt={rolePermissions?.updatedAt}
            permissions={allPermissions}
            selectedPermissionIds={selectedPermissionIds}
            onTogglePermission={togglePermission}
            onToggleModule={toggleModule}
            onToggleAll={toggleAll}
            onSave={handleSave}
            canEdit={canEdit}
            isSaving={saveMutation.isPending}
            isLoading={matrixLoading || rolePermissionsLoading}
            isAuditLoading={rolePermissionsLoading}
            hasChanges={isDirty}
          />
        </div>
      </div>

      <UnsavedChangesDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        onStay={handleStay}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
