"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  ExternalLink,
  Loader2,
  Users,
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
import { useUsers } from "@/hooks/users/useUsers";
import type { Department } from "@/types/department.types";

interface DepartmentRelatedTabProps {
  department: Department;
  departmentId: string;
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

const getRoleName = (role: unknown): string => {
  if (!role) return "—";
  if (typeof role === "string") return role;
  if (typeof role === "object" && role !== null && "name" in role) {
    return String((role as { name?: string }).name || "—");
  }
  return "—";
};

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

export function DepartmentRelatedTab({
  department,
  departmentId,
}: DepartmentRelatedTabProps) {
  const organizationId = department.organizationId || "";

  const { users, total, isLoading } = useUsers({
    departmentId,
    organizationId: organizationId || undefined,
    page: 1,
    limit: 50,
  });

  const usersListHref = organizationId
    ? `/users?organizationId=${encodeURIComponent(organizationId)}&departmentId=${encodeURIComponent(departmentId)}`
    : `/users?departmentId=${encodeURIComponent(departmentId)}`;

  const activityItems = useMemo(() => {
    const items: Array<{
      id: string;
      icon: React.ReactNode;
      title: string;
      description: string;
      when: string;
      at: number;
    }> = [];

    if (department.createdAt) {
      items.push({
        id: "created",
        icon: <Users className="h-3.5 w-3.5" />,
        title: "Department created",
        description: `${department.name} was created`,
        when: formatDateTime(department.createdAt),
        at: new Date(department.createdAt).getTime(),
      });
    }

    if (
      department.updatedAt &&
      department.createdAt &&
      new Date(department.updatedAt).getTime() !==
        new Date(department.createdAt).getTime()
    ) {
      items.push({
        id: "updated",
        icon: <Users className="h-3.5 w-3.5" />,
        title: "Department updated",
        description: "Department details were modified",
        when: formatDateTime(department.updatedAt),
        at: new Date(department.updatedAt).getTime(),
      });
    }

    return items.sort((a, b) => b.at - a.at);
  }, [department.createdAt, department.name, department.updatedAt]);

  return (
    <div className="space-y-4">
      <RelatedCard
        title="Assigned Users"
        description={`${total} user${total === 1 ? "" : "s"} assigned to this department`}
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href={usersListHref}>
              View users
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      >
        {isLoading ? (
          <LoadingState />
        ) : users.length === 0 ? (
          <EmptyState message="No users are assigned to this department." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
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
                      <TableCell>{getRoleName(user.roleId)}</TableCell>
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
        title="Organization"
        description="Organization this department belongs to"
      >
        {!organizationId ? (
          <EmptyState message="No organization linked to this department." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <LinkCell href={`/organizations/${organizationId}`}>
                        {department.organizationName || "—"}
                      </LinkCell>
                    </div>
                  </TableCell>
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
        description="Department lifecycle events"
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
