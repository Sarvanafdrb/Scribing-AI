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
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { LinkCell } from "@/components/shared/LinkCell";
import { RoleActions } from "./RoleActions";
import { Role } from "@/types/role.types";

interface RoleTableProps {
  roles: Role[];
  onStatusChange: () => void;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function RoleTable({
  roles,
  onStatusChange,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: RoleTableProps) {
  const formatDate = (date?: string | Date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Role Name</TableHead>
              <TableHead className="font-bold">Description</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Created</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No roles found
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => {
                const roleId = role.id || role._id || role.name;
                const isActive = role.isActive !== false;

                return (
                  <TableRow key={roleId}>
                    <TableCell>
                      <LinkCell href={`/roles/${roleId}`}>{role.name}</LinkCell>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[420px] truncate text-sm text-muted-foreground">
                        {role.description || "-"}
                      </p>
                    </TableCell>
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
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(role.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <RoleActions role={role} onStatusChange={onStatusChange} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing {start}-{end} of {total} roles
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="px-2 text-sm font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
