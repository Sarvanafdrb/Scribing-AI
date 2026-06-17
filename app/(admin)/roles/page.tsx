"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleFilters } from "./components/RoleFilters";
import { RoleTable } from "./components/RoleTable";
import { RoleSkeleton } from "./components/RoleSkeleton";
import { useRoles } from "@/hooks/roles/useRoles";
import { useOrganizations } from "@/hooks/organizations/useOrganizations";

const PAGE_SIZE = 5;

export default function RolesPage() {
  const [search, setSearch] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [page, setPage] = useState(1);

  const { organizations } = useOrganizations({ page: 1, limit: 100 });

  useEffect(() => {
    if (!organizationId && organizations.length > 0) {
      const firstOrgId = organizations[0].id || organizations[0]._id || "";
      setOrganizationId(firstOrgId);
    }
  }, [organizations, organizationId]);

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
    organizationId,
    search,
    page,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    setPage(1);
  }, [search, organizationId]);

  const handleClearFilters = () => {
    setSearch("");
    setPage(1);
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
        organizationId={organizationId}
        onOrganizationChange={setOrganizationId}
        organizationOptions={organizationOptions}
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
