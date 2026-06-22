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

interface RoleFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  organizationId: string;
  onOrganizationChange: (value: string) => void;
  organizationOptions: Array<{ id: string; name: string }>;
  onClearFilters: () => void;
}

export function RoleFilters({
  search,
  onSearchChange,
  organizationId,
  onOrganizationChange,
  organizationOptions,
  onClearFilters,
}: RoleFiltersProps) {
  const hasFilters = search || organizationId;

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

        <Select value={organizationId} onValueChange={onOrganizationChange}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
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
          {organizationId && (
            <Badge variant="secondary" className="gap-1">
              Organization selected
              <X className="h-3 w-3 cursor-pointer" onClick={() => onOrganizationChange("")} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
