"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/hooks/roles/useRole";
import { useRoleMutations } from "@/hooks/roles/useRoleMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { RoleDetailsTab } from "../components/RoleDetailsTab";
import { RoleRelatedTab } from "../components/RoleRelatedTab";
import type { UpdateRoleData } from "@/types/role.types";
import { cn } from "@/lib/utils";

type RoleTab = "details" | "related";

export default function RoleDetailsPage() {
  const { id } = useParams();
  const roleId = id as string;
  const [activeTab, setActiveTab] = useState<RoleTab>("details");
  const { data: role, isLoading } = useRole(roleId);
  const { updateRole, activateRole, deactivateRole } = useRoleMutations();
  const { canEditRole } = useAccessControl();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 text-center">
        <h2 className="text-lg font-semibold">Role not found</h2>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/roles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
          </Link>
        </Button>
      </div>
    );
  }

  const recordId = String(role.id || role._id || roleId);
  const isActive = role.isActive !== false;
  const canEdit = canEditRole() && isActive;
  const orgId =
    typeof role.organizationId === "string" ? role.organizationId : "";
  const rolesListHref = orgId
    ? `/roles?organizationId=${encodeURIComponent(orgId)}`
    : "/roles";

  const handleInlineUpdate = async (data: UpdateRoleData) => {
    if (typeof data.isActive === "boolean" && Object.keys(data).length === 1) {
      if (data.isActive) {
        await activateRole.mutateAsync(recordId);
      } else {
        await deactivateRole.mutateAsync(recordId);
      }
      return;
    }
    await updateRole.mutateAsync({ id: recordId, data });
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <Link
        href={rolesListHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Roles
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {role.name || "Role"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {role.description || "No description"}
            </p>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={isActive ? "bg-primary" : undefined}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditRole() && isActive ? (
            <Button asChild className="rounded-full">
              <Link href={`/roles/edit/${recordId}`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Role
              </Link>
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/roles/edit/${recordId}`}>Open full edit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/permissions">Manage permissions</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={rolesListHref}>Back to list</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border-b border-border/60">
        <nav className="flex gap-1" aria-label="Role sections">
          {(
            [
              { key: "details", label: "Details" },
              { key: "related", label: "Related" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "-mb-px border-b px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "details" ? (
        <RoleDetailsTab
          role={role}
          roleId={recordId}
          canEdit={canEdit}
          onUpdateField={handleInlineUpdate}
        />
      ) : (
        <RoleRelatedTab role={role} roleId={recordId} />
      )}
    </div>
  );
}
