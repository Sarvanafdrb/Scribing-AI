"use client";

import Link from "next/link";
import {
  Building2,
  ExternalLink,
  KeyRound,
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
import { ChangePasswordForm } from "@/app/(admin)/settings/components/ChangePasswordForm";
import { useAuthStore } from "@/store/auth.store";
import type { AuthUser } from "@/types/auth.types";

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

export function SettingsRelatedTab() {
  const user = useAuthStore((state) => state.user) as AuthUser | null;

  if (!user) {
    return <EmptyState message="Sign in to view related account settings." />;
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const roleName = user.roleName || user.role?.name || "—";
  const roleId = user.role?.id || user.role?._id || "";
  const orgId =
    user.organizationId ||
    user.organization?.id ||
    user.organization?._id ||
    "";
  const orgName = user.isSuperAdmin
    ? "Super Admin"
    : user.organizationName || user.organization?.name || "—";
  const permissions = user.permissions || [];

  return (
    <div className="space-y-4">
      <RelatedCard
        title="Security"
        description="Update your password to keep the account secure"
        action={
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" />
            Password
          </span>
        }
      >
        <ChangePasswordForm embedded />
      </RelatedCard>

      <RelatedCard
        title="Role Assignment"
        description="Primary role assigned to your account"
        action={
          roleId ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Link href={`/roles/${roleId}`}>
                View role
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null
        }
      >
        {!roleId && roleName === "—" ? (
          <EmptyState message="No role assigned to this account." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      {roleId ? (
                        <LinkCell href={`/roles/${roleId}`}>
                          {roleName}
                        </LinkCell>
                      ) : (
                        <span className="font-medium">{roleName}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.isSuperAdmin ? "default" : "secondary"}
                      className={user.isSuperAdmin ? "bg-primary" : undefined}
                    >
                      {user.isSuperAdmin ? "Super Admin" : "Standard"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {roleId ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                      >
                        <Link href={`/roles/${roleId}`}>Open</Link>
                      </Button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Organization Membership"
        description="Organization linked to your account"
        action={
          orgId && !user.isSuperAdmin ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Link href={`/organizations/${orgId}`}>
                View organization
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null
        }
      >
        {user.isSuperAdmin ? (
          <div className="rounded-xl border border-border/50 px-4 py-6 text-sm text-muted-foreground">
            Super Admin accounts are not scoped to a single organization.
          </div>
        ) : !orgId ? (
          <EmptyState message="No organization linked to this account." />
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
                      <LinkCell href={`/organizations/${orgId}`}>
                        {orgName}
                      </LinkCell>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {user.organization?.organizationCode || "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                    >
                      <Link href={`/organizations/${orgId}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Account"
        description="Quick links for your user record"
      >
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    {user.id ? (
                      <LinkCell href={`/users/${user.id}`}>
                        {fullName || "User"}
                      </LinkCell>
                    ) : (
                      fullName || "User"
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  {user.id ? (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                    >
                      <Link href={`/users/${user.id}`}>Open record</Link>
                    </Button>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </RelatedCard>
    </div>
  );
}
