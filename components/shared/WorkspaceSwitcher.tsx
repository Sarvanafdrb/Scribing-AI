"use client";

import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Globe2, Search } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspaceSelection } from "@/hooks/useWorkspaceSelection";
import { useAccessControl } from "@/hooks/useAccessControl";
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
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        Active
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-auto min-h-9 max-w-xs justify-between gap-2 border-blue-200 bg-white px-3 py-2 text-left hover:bg-blue-50",
            compact && "max-w-[220px]",
            className,
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
              {isAllSelected ? (
                <Globe2 className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {selectedWorkspace.name}
              </p>
              {!compact && isSuperAdmin && (
                <p className="truncate text-xs text-gray-500">
                  {selectedWorkspace.organizationName}
                </p>
              )}
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-0">
        <div className="border-b p-3">
          <DropdownMenuLabel className="px-0 pb-2 text-sm font-semibold">
            Switch workspace
          </DropdownMenuLabel>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                  isAllSelected && "bg-blue-50",
                )}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                  <Globe2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-900">
                      All Organizations
                    </p>
                    {isAllSelected && (
                      <Check className="h-4 w-4 shrink-0 text-blue-600" />
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-500">
                    Platform-wide aggregated data
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {filteredWorkspaces.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">
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
                    isSelected && "bg-blue-50",
                  )}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {workspace.name}
                      </p>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                    </div>
                    <p className="truncate text-xs text-gray-500">
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
        <div className="px-3 py-2 text-xs text-gray-500">
          {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"} available
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
