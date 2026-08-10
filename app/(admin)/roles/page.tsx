"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleFilters } from "./components/RoleFilters";
import { RoleTable } from "./components/RoleTable";
import { RoleSkeleton } from "./components/RoleSkeleton";
import { useRoles } from "@/hooks/roles/useRoles";
import { useOrganizations } from "@/hooks/organizations/useOrganizations";
import { useTenantScope } from "@/hooks/useTenantScope";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspaceSelection } from "@/hooks/useWorkspaceSelection";
import {
  ALL_ORGANIZATIONS_WORKSPACE,
  ALL_ORGANIZATIONS_WORKSPACE_ID,
} from "@/utils/workspace.utils";
import { Organization } from "@/types/organization.types";
import { Workspace } from "@/types/workspace.types";

const PAGE_SIZE = 5;

const organizationToWorkspace = (org: Organization): Workspace => {
  const id = org.id || org._id || "";
  return {
    id,
    name: org.name,
    organizationId: id,
    organizationName: org.name,
    organizationCode: org.organizationCode,
    status: org.isActive === false ? "inactive" : "active",
  };
};

export default function RolesPage() {
  const searchParams = useSearchParams();
  const organizationIdFromUrl = searchParams.get("organizationId") || "";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const didApplyUrlOrg = useRef(false);

  const { organizations } = useOrganizations({ page: 1, limit: 100 });
  const { workspaces } = useWorkspaces();
  const {
    organizationId: scopedOrgId,
    isSuperAdmin,
    isAllOrganizations,
  } = useTenantScope();
  const { selectWorkspace, switchWorkspace } = useWorkspaceSelection();

  const showAllOrganizations = isSuperAdmin;
  const selectedOrganizationId =
    isAllOrganizations || (showAllOrganizations && !scopedOrgId)
      ? ALL_ORGANIZATIONS_WORKSPACE_ID
      : scopedOrgId;

  useEffect(() => {
    if (didApplyUrlOrg.current) return;

    if (!organizationIdFromUrl) {
      didApplyUrlOrg.current = true;
      return;
    }

    const urlIsAll =
      organizationIdFromUrl === ALL_ORGANIZATIONS_WORKSPACE_ID ||
      organizationIdFromUrl.toLowerCase() === "all";

    if (urlIsAll) {
      didApplyUrlOrg.current = true;
      if (showAllOrganizations && !isAllOrganizations) {
        selectWorkspace(ALL_ORGANIZATIONS_WORKSPACE);
      }
      return;
    }

    if (scopedOrgId === organizationIdFromUrl) {
      didApplyUrlOrg.current = true;
      return;
    }

    const workspace =
      workspaces.find((item) => item.id === organizationIdFromUrl) ||
      workspaces.find((item) => item.organizationId === organizationIdFromUrl);

    if (workspace) {
      didApplyUrlOrg.current = true;
      selectWorkspace(workspace);
      return;
    }

    const org = organizations.find(
      (item) => (item.id || item._id || "") === organizationIdFromUrl,
    );

    if (org) {
      didApplyUrlOrg.current = true;
      selectWorkspace(organizationToWorkspace(org));
      return;
    }

    if (workspaces.length > 0 || organizations.length > 0) {
      didApplyUrlOrg.current = true;
    }
  }, [
    organizationIdFromUrl,
    organizations,
    workspaces,
    scopedOrgId,
    isAllOrganizations,
    showAllOrganizations,
    selectWorkspace,
  ]);

  const {
    roles,
    isLoading,
    error,
    total,
    totalPages,
    activeCount,
    inactiveCount,
    refetch,
  } = useRoles({
    search,
    page,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    setPage(1);
  }, [search, scopedOrgId, isAllOrganizations]);

  const resolveWorkspace = (organizationId: string): Workspace | null => {
    if (!organizationId || organizationId === ALL_ORGANIZATIONS_WORKSPACE_ID) {
      return ALL_ORGANIZATIONS_WORKSPACE;
    }

    const workspace =
      workspaces.find((item) => item.id === organizationId) ||
      workspaces.find((item) => item.organizationId === organizationId);

    if (workspace) return workspace;

    const org = organizations.find(
      (item) => (item.id || item._id || "") === organizationId,
    );

    return org ? organizationToWorkspace(org) : null;
  };

  const handleOrganizationChange = (organizationId: string) => {
    const workspace = resolveWorkspace(organizationId);
    if (!workspace) return;

    if (
      !showAllOrganizations &&
      workspace.id === ALL_ORGANIZATIONS_WORKSPACE_ID
    ) {
      return;
    }

    switchWorkspace(workspace);
  };

  const handleClearFilters = () => {
    setSearch("");
    setPage(1);
    if (showAllOrganizations && !isAllOrganizations) {
      switchWorkspace(ALL_ORGANIZATIONS_WORKSPACE);
    }
  };

  const organizationOptions = organizations.map((org) => ({
    id: org.id || org._id || "",
    name: org.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roles</h1>
          <p className="text-muted-foreground">Manage roles - {total} total</p>
        </div>
        <Link href="/roles/create">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            New Role
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{inactiveCount}</div>
          </CardContent>
        </Card>
      </div>

      <RoleFilters
        search={search}
        onSearchChange={setSearch}
        organizationId={selectedOrganizationId}
        onOrganizationChange={handleOrganizationChange}
        organizationOptions={organizationOptions}
        showAllOrganizations={showAllOrganizations}
        onClearFilters={handleClearFilters}
      />

      {isLoading ? (
        <RoleSkeleton count={5} />
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Failed to load roles.{" "}
            <Button variant="link" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <RoleTable
          roles={roles}
          onStatusChange={refetch}
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
