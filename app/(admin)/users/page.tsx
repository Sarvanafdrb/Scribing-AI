"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserFilters } from "./components/UserFilters";
import { UserTable } from "./components/UserTable";
import { UserSkeleton } from "./components/UserSkeleton";
import { useUsers } from "@/hooks/users/useUsers";
import { useAccessControl } from "@/hooks/useAccessControl";

const PAGE_SIZE = 5;

export default function UsersPage() {
  const { canCreateUser, canViewUsers, canManageAllUsers } = useAccessControl();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const {
    users,
    isLoading,
    error,
    total,
    totalPages,
    activeCount,
    inactiveCount,
    refetch,
  } = useUsers({
    search,
    isActive: status === "all" ? undefined : status,
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

  if (!canViewUsers()) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            {canManageAllUsers
              ? `Manage system users • ${total} total`
              : "View your profile"}
          </p>
        </div>
        {canCreateUser() && (
          <Link href="/users/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New User
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="text-2xl font-bold text-gray-500">
              {inactiveCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <UserFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        onClearFilters={handleClearFilters}
      />

      {isLoading ? (
        <UserSkeleton count={5} />
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Failed to load users.{" "}
            <Button variant="link" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <UserTable
          users={users}
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
