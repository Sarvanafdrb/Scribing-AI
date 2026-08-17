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
import { INVITATION_STATUS_OPTIONS } from "./InvitationStatusBadge";

interface InvitationFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  roleId: string;
  onRoleChange?: (value: string) => void;
  roleOptions?: Array<{ id: string; name: string }>;
  departmentId: string;
  onDepartmentChange?: (value: string) => void;
  departmentOptions?: Array<{ id: string; name: string }>;
  onClearFilters: () => void;
}

export function InvitationFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  roleId = "all",
  onRoleChange,
  roleOptions = [],
  departmentId = "all",
  onDepartmentChange,
  departmentOptions = [],
  onClearFilters,
}: InvitationFiltersProps) {
  const hasFilters =
    search ||
    status !== "all" ||
    roleId !== "all" ||
    departmentId !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            {INVITATION_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {onRoleChange && (
          <Select value={roleId} onValueChange={onRoleChange}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roleOptions.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {onDepartmentChange && (
          <Select value={departmentId} onValueChange={onDepartmentChange}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departmentOptions.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onSearchChange("")}
              />
            </Badge>
          )}
          {status !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {status.toLowerCase()}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onStatusChange("all")}
              />
            </Badge>
          )}
          {roleId !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Role: {roleOptions.find((item) => item.id === roleId)?.name || roleId}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onRoleChange?.("all")}
              />
            </Badge>
          )}
          {departmentId !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Department:{" "}
              {departmentOptions.find((item) => item.id === departmentId)
                ?.name || departmentId}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onDepartmentChange?.("all")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
