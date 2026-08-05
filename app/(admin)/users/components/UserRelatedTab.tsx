"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ExternalLink,
  Loader2,
  Mail,
  Shield,
  UserRound,
  LogIn,
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
import type { Permission } from "@/types/permission.types";
import type { User } from "@/types/user.types";

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

const actionLabel = (action: string) => {
  const a = action.toLowerCase();
  if (a === "read") return "Read";
  if (a === "write") return "Write";
  if (a === "update") return "Update";
  if (a === "delete") return "Delete";
  if (a === "export") return "Export";
  if (a === "manage") return "Manage";
  // Fallback: Title Case
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
}) => {
  return (
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
};

const EmptyState = ({ message }: { message: string }) => {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
};

const LoadingState = () => {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading…
    </div>
  );
};

export function UserRelatedTab({
  user,
  userId,
  canEdit,
  onRemoveRole,
}: UserRelatedTabProps) {
  const anyUser = user as any;

  const role = typeof user.roleId === "object" ? user.roleId : null;
  const roleId =
    (typeof user.roleId === "object"
      ? (user.roleId as any)?._id || (user.roleId as any)?.id
      : user.roleId) || "";

  const org =
    typeof user.organizationId === "object" ? user.organizationId : null;
  const orgId = (org as any)?.id || (org as any)?._id || "";
  const orgName = (org as any)?.name || (user as any).organizationName || "";

  const qualifications: string[] = Array.isArray(anyUser.qualifications)
    ? anyUser.qualifications
    : [];

  const inferredDepartment = anyUser.department || qualifications[0] || "—";
  const inferredDesignation =
    anyUser.designation ||
    qualifications[1] ||
    qualifications.join(", ") ||
    "—";

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

  const activityItems = useMemo(() => {
    const items: Array<{
      id: string;
      icon: React.ReactNode;
      title: string;
      description: string;
      when: string;
      at: number;
    }> = [];

    if (user.createdAt) {
      items.push({
        id: "created",
        icon: <UserRound className="h-3.5 w-3.5" />,
        title: "User created",
        description: "Account record was created",
        when: formatDateTime(user.createdAt),
        at: new Date(user.createdAt).getTime(),
      });
    }

    if (user.isEmailVerified) {
      items.push({
        id: "email-verified",
        icon: <Mail className="h-3.5 w-3.5" />,
        title: "Email verified",
        description: user.email
          ? `Email verified for ${user.email}`
          : "Email verified",
        when: formatDateTime(user.updatedAt || user.createdAt),
        at: new Date(user.updatedAt || user.createdAt || Date.now()).getTime(),
      });
    }

    if (roleRecord?.name) {
      items.push({
        id: "role-assigned",
        icon: <Shield className="h-3.5 w-3.5" />,
        title: "Role assigned",
        description: `Primary role set to ${roleRecord.name}`,
        when: formatDateTime(user.updatedAt || user.createdAt),
        at: new Date(user.updatedAt || user.createdAt || Date.now()).getTime(),
      });
    }

    if (permissionsQuery.data?.updatedAt) {
      items.push({
        id: "permission-updated",
        icon: <Shield className="h-3.5 w-3.5" />,
        title: "Permission updated",
        description: "Role permissions were updated",
        when: formatDateTime(permissionsQuery.data.updatedAt),
        at: new Date(permissionsQuery.data.updatedAt || Date.now()).getTime(),
      });
    }

    if (user.lastLogin) {
      items.push({
        id: "login",
        icon: <LogIn className="h-3.5 w-3.5" />,
        title: "User logged in",
        description: "Successful login recorded",
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
        icon: <UserRound className="h-3.5 w-3.5" />,
        title: "Profile updated",
        description: "User record was modified",
        when: formatDateTime(user.updatedAt),
        at: new Date(user.updatedAt).getTime(),
      });
    }

    return items.sort((a, b) => b.at - a.at);
  }, [
    permissionsQuery.data,
    roleRecord?.name,
    user.createdAt,
    user.email,
    user.isEmailVerified,
    user.lastLogin,
    user.updatedAt,
  ]);

  return (
    <div className="space-y-4">
      <RelatedCard
        title="Assigned Roles"
        description="Primary role assigned to this user"
      >
        {!roleId ? (
          <EmptyState message="No role assigned to this user." />
        ) : roleDetailQuery.isLoading ? (
          <LoadingState />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    {roleId ? (
                      <LinkCell href={`/roles/${roleId}`}>
                        {roleRecord?.name || "—"}
                      </LinkCell>
                    ) : (
                      roleRecord?.name || "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {roleRecord?.description || "—"}
                  </TableCell>
                  <TableCell>
                    {formatDate(
                      roleDetailQuery.data?.createdAt || user.createdAt,
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                      >
                        <Link href={`/roles/${roleId}`}>
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                      {/* {canEdit && onRemoveRole ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="rounded-full"
                          onClick={() => void onRemoveRole().catch(() => toast.error("Unable to remove role."))}
                        >
                          Remove
                        </Button>
                      ) : null} */}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Permission Matrix"
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
          <div className="overflow-x-auto">
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
                      (permission as any).id ||
                      permission._id ||
                      permission.code
                    }
                    permission={permission}
                    roleName={roleRecord?.name}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Organization Membership"
        description="Organization details for this user"
      >
        {orgId ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <LinkCell href={`/organizations/${orgId}`}>
                      {orgName || "—"}
                    </LinkCell>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {inferredDepartment}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {inferredDesignation}
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.isActive !== false ? "default" : "secondary"
                      }
                      className={
                        user.isActive !== false ? "bg-primary" : undefined
                      }
                    >
                      {user.isActive !== false ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState message="No organization membership available." />
        )}
      </RelatedCard>

      <RelatedCard
        title="Login History"
        description="Login activity for this user"
      >
        <EmptyState message="No login history available." />
      </RelatedCard>

      <RelatedCard
        title="Activity Timeline"
        description="Salesforce-style vertical timeline of user events"
      >
        {activityItems.length === 0 ? (
          <EmptyState message="No activity recorded." />
        ) : (
          <ol className="relative space-y-4 border-l border-border/70 pl-5">
            {activityItems.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute top-1.5 -left-[1.4rem] flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                  {item.icon}
                </span>
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
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
