"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Role } from "@/types/role.types";
import { Search, Shield } from "lucide-react";

interface RoleListPanelProps {
  roles: Role[];
  selectedRoleId: string;
  onSelectRole: (roleId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
}

export function RoleListPanel({
  roles,
  selectedRoleId,
  onSelectRole,
  search,
  onSearchChange,
  isLoading,
}: RoleListPanelProps) {
  const filteredRoles = roles.filter((role) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      role.name?.toLowerCase().includes(term) ||
      role.description?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex h-full flex-col rounded-lg border bg-white shadow-sm">
      <div className="border-b bg-slate-50 px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900">Roles</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search roles..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-md bg-slate-100"
              />
            ))}
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No roles found for this organization.
          </div>
        ) : (
          <div className="space-y-1">
            {filteredRoles.map((role) => {
              const roleId = role.id || role._id || "";
              const isSelected = roleId === selectedRoleId;
              const isActive = role.isActive !== false;

              return (
                <button
                  key={roleId}
                  type="button"
                  onClick={() => onSelectRole(roleId)}
                  className={cn(
                    "w-full rounded-md border px-3 py-3 text-left transition-colors",
                    isSelected
                      ? "border-blue-600 bg-blue-50 shadow-sm"
                      : "border-transparent hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize text-slate-900">
                      {role.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        isActive
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-500"
                      }
                    >
                      {isActive ? "active" : "inactive"}
                    </Badge>
                  </div>
                  {role.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
