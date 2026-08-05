"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  Loader2,
  Shield,
  UserRound,
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
import { roleService } from "@/services/role.service";
import { roleKeys } from "@/services/role.queries";
import type { User } from "@/types/user.types";
import type { Permission } from "@/types/permission.types";

interface UserRelatedTabProps {
  user: User;
  userId: string;
  canEdit: boolean;
  onRemoveRole?: () => Promise<void>;
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

const formatModule = (module: string) =>
  module
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const formatAction = (action: string) =>
  action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();

export function UserRelatedTab({
  user,
  userId,
  canEdit,
  onRemoveRole,
}: UserRelatedTabProps) {
  const role = typeof user.roleId === "object" ? user.roleId : null;
  const roleId =
    (typeof user.roleId === "object"
      ? user.roleId?._id || user.roleId?.id
      : user.roleId) || "";

  const roleDetailQuery = useQuery({
    queryKey: roleKeys.detail(String(roleId)),
    queryFn: () => roleService.getById(String(roleId)),
    enabled: Boolean(roleId),
    staleTime: 5 * 60 * 1000,
  });

  const permissionsQuery = useQuery({
    queryKey: roleKeys.rolePermissions(String(roleId)),
    queryFn: () => roleService.getPermissions(String(roleId)),
    enabled: Boolean(roleId),
    staleTime: 5 * 60 * 1000,
  });

  const roleRecord = roleDetailQuery.data || role;
  const permissions = permissionsQuery.data?.permissions || [];

  const activityItems = useMemo(
    () => buildActivityLog(user),
    [user],
  );

  return (
    <div className="space-y-4">
      <RelatedCard
        title="Assigned Roles"
        description="Primary role assigned to this user"
        action={
          roleId ? (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/roles/${roleId}`}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                View
              </Link>
            </Button>
          ) : null
        }
      >
        {!roleId ? (
          <EmptyState message="No role assigned to this user." />
        ) : roleDetailQuery.isLoading ? (
          <LoadingState />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <LinkCell href={`/roles/${roleId}`}>
                      {roleRecord?.name || "—"}
                    </LinkCell>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {roleDetailQuery.data?.description ||
                      role?.description ||
                      "—"}
                  </TableCell>
                  <TableCell>
                    {formatDate(roleDetailQuery.data?.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                      >
                        <Link href={`/roles/${roleId}`}>View</Link>
                      </Button>
                      {canEdit && onRemoveRole ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="rounded-full"
                          onClick={() => void onRemoveRole()}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Permissions"
        description="Permissions inherited from the assigned role"
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/permissions">
              <Shield className="mr-1.5 h-3.5 w-3.5" />
              Matrix
            </Link>
          </Button>
        }
      >
        {!roleId ? (
          <EmptyState message="Assign a role to view permissions." />
        ) : permissionsQuery.isLoading ? (
          <LoadingState />
        ) : permissions.length === 0 ? (
          <EmptyState message="No permissions found for this role." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission Name</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <PermissionRow
                    key={permission.id || permission._id || permission.code}
                    permission={permission}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Login History"
        description="Recent authentication attempts for this user"
      >
        <EmptyState message="Login history is not available from the current API." />
      </RelatedCard>

      <RelatedCard
        title="Activity Log"
        description="Recent profile and access events"
      >
        {activityItems.length === 0 ? (
          <EmptyState message="No recent activity recorded." />
        ) : (
          <ol className="relative space-y-4 border-l border-border/70 pl-5">
            {activityItems.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute top-1.5 -left-[1.4rem] flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <UserRound className="h-3 w-3" />
                </span>
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  {item.when}
                </p>
              </li>
            ))}
          </ol>
        )}
      </RelatedCard>
    </div>
  );
}

function PermissionRow({ permission }: { permission: Permission }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {formatModule(permission.module)} {formatAction(permission.action)}
      </TableCell>
      <TableCell>{formatModule(permission.module)}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="capitalize">
          {formatAction(permission.action)}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function RelatedCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-3xl p-4 sm:p-5">
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
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading…
    </div>
  );
}

function buildActivityLog(user: User) {
  const items: Array<{ id: string; title: string; detail: string; when: string; at: number }> =
    [];

  if (user.createdAt) {
    items.push({
      id: "created",
      title: "User created",
      detail: "Account record was created",
      when: formatDateTime(user.createdAt),
      at: new Date(user.createdAt).getTime(),
    });
  }

  if (user.isEmailVerified) {
    items.push({
      id: "email-verified",
      title: "Email verified",
      detail: user.email,
      when: formatDateTime(user.updatedAt || user.createdAt),
      at: new Date(user.updatedAt || user.createdAt || Date.now()).getTime(),
    });
  }

  if (typeof user.roleId === "object" && user.roleId?.name) {
    items.push({
      id: "role-assigned",
      title: "Role assigned",
      detail: `Primary role set to ${user.roleId.name}`,
      when: formatDateTime(user.updatedAt || user.createdAt),
      at: new Date(user.updatedAt || user.createdAt || Date.now()).getTime() - 1,
    });
  }

  if (user.lastLogin) {
    items.push({
      id: "last-login",
      title: "User logged in",
      detail: "Successful login recorded",
      when: formatDateTime(user.lastLogin),
      at: new Date(user.lastLogin).getTime(),
    });
  }

  if (
    user.updatedAt &&
    user.createdAt &&
    new Date(user.updatedAt).getTime() !== new Date(user.createdAt).getTime()
  ) {
    items.push({
      id: "profile-updated",
      title: "Profile updated",
      detail: "User record was modified",
      when: formatDateTime(user.updatedAt),
      at: new Date(user.updatedAt).getTime(),
    });
  }

  return items.sort((a, b) => b.at - a.at);
}
