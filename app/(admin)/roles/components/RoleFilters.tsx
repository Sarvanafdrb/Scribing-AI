"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ALL_ORGANIZATIONS_WORKSPACE_ID } from "@/utils/workspace.utils";

interface RoleFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  organizationId: string;
  onOrganizationChange: (value: string) => void;
  organizationOptions: Array<{ id: string; name: string }>;
  showAllOrganizations?: boolean;
  onClearFilters: () => void;
}

export function RoleFilters({
  search,
  onSearchChange,
  organizationId,
  onOrganizationChange,
  organizationOptions,
  showAllOrganizations = false,
  onClearFilters,
}: RoleFiltersProps) {
  const isSpecificOrganization =
    Boolean(organizationId) &&
    organizationId !== ALL_ORGANIZATIONS_WORKSPACE_ID;
  const hasFilters = Boolean(search) || isSpecificOrganization;
  const selectValue =
    organizationId ||
    (showAllOrganizations ? ALL_ORGANIZATIONS_WORKSPACE_ID : undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectValue} onValueChange={onOrganizationChange}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            {showAllOrganizations && (
              <SelectItem value={ALL_ORGANIZATIONS_WORKSPACE_ID}>
                All Organizations
              </SelectItem>
            )}
            {organizationOptions.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {search && (
            <Badge variant="secondary" className="gap-1">
              Search: {search}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onSearchChange("")} />
            </Badge>
          )}
          {isSpecificOrganization && (
            <Badge variant="secondary" className="gap-1">
              Organization selected
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onOrganizationChange(ALL_ORGANIZATIONS_WORKSPACE_ID)
                }
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
