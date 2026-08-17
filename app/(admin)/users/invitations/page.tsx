"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserSkeleton } from "../components/UserSkeleton";
import { UsersSubNav } from "../components/UsersSubNav";
import { InvitationFilters } from "./components/InvitationFilters";
import { InvitationTable } from "./components/InvitationTable";
import { useInvitations } from "@/hooks/invitations/useInvitations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useRoles } from "@/hooks/roles/useRoles";
import { useDepartments } from "@/hooks/departments/useDepartments";

const PAGE_SIZE = 5;

export default function InvitationsPage() {
  const { canCreateUser, canViewDepartments } = useAccessControl();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [roleId, setRoleId] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [page, setPage] = useState(1);

  const {
    invitations,
    isLoading,
    error,
    total,
    totalPages,
    refetch,
  } = useInvitations({
    search,
    status,
    roleId,
    departmentId,
    page,
    limit: PAGE_SIZE,
    enabled: canCreateUser(),
  });

  const { roles } = useRoles({ page: 1, limit: 100 });
  const { departments } = useDepartments({
    page: 1,
    limit: 100,
    enabled: canViewDepartments(),
  });

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const updateStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const updateRoleId = (value: string) => {
    setRoleId(value);
    setPage(1);
  };

  const updateDepartmentId = (value: string) => {
    setDepartmentId(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("all");
    setRoleId("all");
    setDepartmentId("all");
    setPage(1);
  };

  if (!canCreateUser()) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to manage invitations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UsersSubNav active="invitations" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invitations</h1>
          <p className="text-muted-foreground">
            Manage pending invitations and onboarding • {total} total
          </p>
        </div>
        <Link href="/users/invitations/invite">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </Link>
      </div>

      <InvitationFilters
        search={search}
        onSearchChange={updateSearch}
        status={status}
        onStatusChange={updateStatus}
        roleId={roleId}
        onRoleChange={updateRoleId}
        roleOptions={roles.map((role) => ({
          id: role.id || role._id || "",
          name: role.name,
        }))}
        departmentId={departmentId}
        onDepartmentChange={
          canViewDepartments() ? updateDepartmentId : undefined
        }
        departmentOptions={departments.map((department) => ({
          id: department.id || department._id || "",
          name: department.name,
        }))}
        onClearFilters={handleClearFilters}
      />

      {isLoading ? (
        <UserSkeleton count={5} />
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Failed to load invitations.{" "}
            <Button variant="link" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : total === 0 &&
        !search &&
        status === "all" &&
        roleId === "all" &&
        departmentId === "all" ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold">No invitations yet</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Invite users to your organization and manage their onboarding from here.
            </p>
            <Link href="/users/invitations/invite" className="inline-block mt-6">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <InvitationTable
          invitations={invitations}
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
