"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkCell } from "@/components/shared/LinkCell";
import { DepartmentActions } from "./DepartmentActions";
import { Department, getDepartmentId } from "@/types/department.types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTenantScope } from "@/hooks/useTenantScope";

interface DepartmentTableProps {
  departments: Department[];
  onStatusChange: () => void;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function DepartmentTable({
  departments,
  onStatusChange,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: DepartmentTableProps) {
  const { isSuperAdmin, isAllOrganizations } = useTenantScope();
  const showOrganization = isSuperAdmin && isAllOrganizations;
  const columnCount = showOrganization ? 6 : 5;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Department</TableHead>
              <TableHead className="font-bold">Description</TableHead>
              {showOrganization && (
                <TableHead className="font-bold">Organization</TableHead>
              )}
              <TableHead className="font-bold">Users</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="py-8 text-center text-muted-foreground"
                >
                  No departments found
                </TableCell>
              </TableRow>
            ) : (
              departments.map((department) => {
                const departmentId = getDepartmentId(department);
                const isActive = department.isActive !== false;

                return (
                  <TableRow key={departmentId}>
                    <TableCell>
                      <LinkCell href={`/departments/${departmentId}`}>
                        <div>
                          <p className="font-medium">{department.name}</p>
                          {department.departmentCode && (
                            <p className="text-xs font-normal text-muted-foreground">
                              ID: {department.departmentCode}
                            </p>
                          )}
                        </div>
                      </LinkCell>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[320px] truncate text-sm text-muted-foreground">
                        {department.description || "—"}
                      </p>
                    </TableCell>
                    {showOrganization && (
                      <TableCell>
                        {department.organizationId ? (
                          <LinkCell href={`/organizations/${department.organizationId}`}>
                            {department.organizationName || "—"}
                          </LinkCell>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>{department.userCount ?? 0}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          isActive
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                        }
                      >
                        {isActive ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DepartmentActions
                        department={department}
                        onStatusChange={onStatusChange}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {start}–{end} of {total} departments
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm font-medium px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
