"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  ExternalLink,
  Loader2,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkCell } from "@/components/shared/LinkCell";
import { organizationService } from "@/services/organization.service";
import { organizationKeys } from "@/services/organization.queries";
import { roleService } from "@/services/role.service";
import { roleKeys } from "@/services/role.queries";
import { userService } from "@/services/user.service";
import { userKeys } from "@/services/user.queries";
import type { Permission } from "@/types/permission.types";
import type { Role } from "@/types/role.types";

interface RoleRelatedTabProps {
  role: Role;
  roleId: string;
}

const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "—";
  }
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
};

const actionLabel = (action: string) => {
  const a = action.toLowerCase();
  if (a === "read") return "Read";
  if (a === "write") return "Write";
  if (a === "update") return "Update";
  if (a === "delete") return "Delete";
  if (a === "export") return "Export";
  if (a === "manage") return "Manage";
  return a.charAt(0).toUpperCase() + a.slice(1);
};

const formatModule = (module: string) =>
  module
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const RelatedCard = ({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="glass rounded-2xl border border-border/60 p-4 sm:p-5 shadow-sm">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
    {message}
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" />
    Loading…
  </div>
);

export function RoleRelatedTab({ role, roleId }: RoleRelatedTabProps) {
  const organizationId =
    typeof role.organizationId === "string" ? role.organizationId : "";

  const orgQuery = useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: () => organizationService.getById(organizationId),
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });

  const permissionsQuery = useQuery({
    queryKey: roleKeys.rolePermissions(roleId),
    queryFn: () => roleService.getPermissions(roleId),
    enabled: Boolean(roleId),
    staleTime: 30 * 1000,
  });

  const usersQuery = useQuery({
    queryKey: userKeys.list({
      roleId,
      organizationId: organizationId || undefined,
      page: 1,
      limit: 50,
    }),
    queryFn: () =>
      userService.getAll({
        roleId,
        organizationId: organizationId || undefined,
        page: 1,
        limit: 50,
      }),
    enabled: Boolean(roleId),
    staleTime: 30 * 1000,
  });

  const permissions = permissionsQuery.data?.permissions || [];
  const users = usersQuery.data?.users || [];
  const totalUsers = usersQuery.data?.total || users.length;
  const orgName = orgQuery.data?.name || "—";
  const orgCode = orgQuery.data?.organizationCode || "—";

  const activityItems = useMemo(() => {
    const items: Array<{
      id: string;
      icon: React.ReactNode;
      title: string;
      description: string;
      when: string;
      at: number;
    }> = [];

    if (role.createdAt) {
      items.push({
        id: "created",
        icon: <Shield className="h-3.5 w-3.5" />,
        title: "Role created",
        description: `${role.name} was created`,
        when: formatDateTime(role.createdAt),
        at: new Date(role.createdAt).getTime(),
      });
    }

    if (
      role.updatedAt &&
      role.createdAt &&
      new Date(role.updatedAt).getTime() !== new Date(role.createdAt).getTime()
    ) {
      items.push({
        id: "updated",
        icon: <Shield className="h-3.5 w-3.5" />,
        title: "Role updated",
        description: "Role details were modified",
        when: formatDateTime(role.updatedAt),
        at: new Date(role.updatedAt).getTime(),
      });
    }

    if (permissionsQuery.data?.updatedAt) {
      items.push({
        id: "permissions-updated",
        icon: <Shield className="h-3.5 w-3.5" />,
        title: "Permissions updated",
        description: permissionsQuery.data.updatedBy
          ? `Updated by ${permissionsQuery.data.updatedBy}`
          : "Role permission matrix was updated",
        when: formatDateTime(permissionsQuery.data.updatedAt),
        at: new Date(permissionsQuery.data.updatedAt).getTime(),
      });
    }

    return items.sort((a, b) => b.at - a.at);
  }, [permissionsQuery.data, role.createdAt, role.name, role.updatedAt]);

  return (
    <div className="space-y-4">
      <RelatedCard
        title="Assigned Users"
        description={`${totalUsers} user${totalUsers === 1 ? "" : "s"} currently assigned this role`}
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link
              href={
                organizationId
                  ? `/users?organizationId=${encodeURIComponent(organizationId)}`
                  : "/users"
              }
            >
              View users
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      >
        {usersQuery.isLoading ? (
          <LoadingState />
        ) : users.length === 0 ? (
          <EmptyState message="No users are assigned to this role." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const userId = String(user.id || user._id || "");
                  const fullName =
                    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                    "—";
                  const active = user.isActive !== false;
                  return (
                    <TableRow key={userId}>
                      <TableCell>
                        <LinkCell href={`/users/${userId}`}>{fullName}</LinkCell>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={active ? "default" : "secondary"}
                          className={active ? "bg-primary" : undefined}
                        >
                          {active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Permission Matrix"
        description="Permissions granted to this role"
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/permissions">
              <Shield className="mr-1.5 h-3.5 w-3.5" />
              Manage permissions
            </Link>
          </Button>
        }
      >
        {permissionsQuery.isLoading ? (
          <LoadingState />
        ) : permissions.length === 0 ? (
          <EmptyState message="No permissions assigned to this role." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Source Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <PermissionMatrixRow
                    key={
                      permission.id || permission._id || permission.code
                    }
                    permission={permission}
                    roleName={role.name}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Organization Membership"
        description="Organization this role belongs to"
      >
        {!organizationId ? (
          <EmptyState message="No organization linked to this role." />
        ) : orgQuery.isLoading ? (
          <LoadingState />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <LinkCell href={`/organizations/${organizationId}`}>
                        {orgName}
                      </LinkCell>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{orgCode}</TableCell>
                  <TableCell>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                    >
                      <Link href={`/organizations/${organizationId}`}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Activity Timeline"
        description="Role lifecycle and permission changes"
      >
        {activityItems.length === 0 ? (
          <EmptyState message="No activity to show yet." />
        ) : (
          <ol className="relative space-y-4 border-l border-border/70 pl-5">
            {activityItems.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-[1.55rem] flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {item.when}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </RelatedCard>
    </div>
  );
}

function PermissionMatrixRow({
  permission,
  roleName,
}: {
  permission: Permission;
  roleName?: string;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{permission.code || "—"}</TableCell>
      <TableCell className="text-muted-foreground">
        {formatModule(permission.module)}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="capitalize">
          {actionLabel(permission.action)}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {roleName ? (
          <Badge variant="outline" className="rounded-full">
            {roleName}
          </Badge>
        ) : (
          "—"
        )}
      </TableCell>
    </TableRow>
  );
}
