"use client";

import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Globe2, Search } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspaceSelection } from "@/hooks/useWorkspaceSelection";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useAuthStore } from "@/store/auth.store";
import { isSingleOrganizationStaffUser } from "@/types/auth.types";
import { Workspace } from "@/types/workspace.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ALL_ORGANIZATIONS_WORKSPACE,
  isAllOrganizationsWorkspace,
  isSameWorkspace,
} from "@/utils/workspace.utils";

interface WorkspaceSwitcherProps {
  className?: string;
  compact?: boolean;
}

const getStatusBadge = (status: Workspace["status"]) => {
  if (status === "active") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        Active
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
    >
      Inactive
    </Badge>
  );
};

export function WorkspaceSwitcher({
  className,
  compact = false,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { workspaces, isLoading } = useWorkspaces();
  const { selectedWorkspace, switchWorkspace } = useWorkspaceSelection();
  const { isSuperAdmin } = useAccessControl();
  const user = useAuthStore((state) => state.user);
  const isSingleOrgStaff = isSingleOrganizationStaffUser(user);

  const filteredWorkspaces = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workspaces;

    return workspaces.filter(
      (workspace) =>
        workspace.name.toLowerCase().includes(query) ||
        workspace.organizationName.toLowerCase().includes(query) ||
        workspace.organizationCode?.toLowerCase().includes(query),
    );
  }, [search, workspaces]);

  const handleSelect = (workspace: Workspace) => {
    switchWorkspace(workspace);
    setOpen(false);
    setSearch("");
  };

  if (isLoading && !selectedWorkspace) {
    return (
      <div className={cn("h-9 w-48 animate-pulse rounded-lg bg-muted", className)} />
    );
  }

  if (!selectedWorkspace) {
    return null;
  }

  const isAllSelected = isAllOrganizationsWorkspace(selectedWorkspace);

  if (isSingleOrgStaff) {
    return (
      <div
        className={cn(
          "flex h-auto min-h-9 max-w-xs items-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-2",
          compact && "max-w-[220px]",
          className,
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {selectedWorkspace.name}
          </p>
          {!compact && (
            <p className="truncate text-xs text-muted-foreground">
              Your organization
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-auto min-h-9 max-w-xs justify-between gap-2 border-border bg-card/80 px-3 py-2 text-left hover:bg-muted/80",
            compact && "max-w-[220px]",
            className,
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
              {isAllSelected ? (
                <Globe2 className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {selectedWorkspace.name}
              </p>
              {!compact && isSuperAdmin && (
                <p className="truncate text-xs text-muted-foreground">
                  {selectedWorkspace.organizationName}
                </p>
              )}
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-0">
        <div className="border-b p-3">
          <DropdownMenuLabel className="px-0 pb-2 text-sm font-semibold">
            Switch workspace
          </DropdownMenuLabel>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search workspaces..."
              className="h-9 pl-8"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {isSuperAdmin && (
            <>
              <DropdownMenuItem
                onSelect={() => handleSelect(ALL_ORGANIZATIONS_WORKSPACE)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md p-3",
                  isAllSelected && "bg-accent",
                )}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
                  <Globe2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      All Organizations
                    </p>
                    {isAllSelected && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    Platform-wide aggregated data
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {filteredWorkspaces.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No workspaces found
            </p>
          ) : (
            filteredWorkspaces.map((workspace) => {
              const isSelected = isSameWorkspace(workspace, selectedWorkspace);

              return (
                <DropdownMenuItem
                  key={workspace.id}
                  onSelect={() => handleSelect(workspace)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md p-3",
                    isSelected && "bg-accent",
                  )}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {workspace.name}
                      </p>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {workspace.organizationName}
                    </p>
                    <div className="mt-2">{getStatusBadge(workspace.status)}</div>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"} available
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
