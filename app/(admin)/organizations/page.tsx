"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationFilters } from "./components/OrganizationFilters";
import { OrganizationTable } from "./components/OrganizationTable";
import { useOrganizations } from "@/hooks/organizations/useOrganizations";
import { OrganizationSkeleton } from "./components/OrganizationSkeleton";
import { useAccessControl } from "@/hooks/useAccessControl";

const PAGE_SIZE = 5;

export default function OrganizationsPage() {
  const { canCreateOrganization } = useAccessControl();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const {
    organizations,
    isLoading,
    error,
    total,
    totalPages,
    activeCount,
    inactiveCount,
    refetch,
  } = useOrganizations({
    search,
    status: status === "all" ? undefined : status,
    page,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const handleClearFilters = () => {
    setSearch("");
    setStatus("all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage all organizations in the system • {total} total
          </p>
        </div>
        {canCreateOrganization() && (
          <Link href="/organizations/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Organization
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {inactiveCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <OrganizationFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        onClearFilters={handleClearFilters}
      />

      {isLoading ? (
        <OrganizationSkeleton count={5} />
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Failed to load organizations.{" "}
            <Button variant="link" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <OrganizationTable
          organizations={organizations || []}
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
