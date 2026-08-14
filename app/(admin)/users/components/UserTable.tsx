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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LinkCell } from "@/components/shared/LinkCell";
import { UserActions } from "./UserActions";
import { User, getUserDepartmentName } from "@/types/user.types";
import { Building2, Calendar, Mail, ChevronLeft, ChevronRight } from "lucide-react";

interface UserTableProps {
  users: User[];
  onStatusChange: () => void;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const getUserId = (user: User) => user.id || user._id || user.email;

const getOrgName = (user: User) => {
  if (typeof user.organizationId === "object" && user.organizationId?.name) {
    return user.organizationId.name;
  }
  return user.organizationName || "—";
};

const getOrgId = (user: User) => {
  if (typeof user.organizationId === "object") {
    return user.organizationId.id || user.organizationId._id;
  }
  return typeof user.organizationId === "string" ? user.organizationId : undefined;
};

const getRoleName = (user: User) => {
  if (typeof user.roleId === "object" && user.roleId?.name) {
    return user.roleId.name;
  }
  return "—";
};

const getRoleId = (user: User) => {
  if (typeof user.roleId === "object") {
    return user.roleId.id || user.roleId._id;
  }
  return typeof user.roleId === "string" ? user.roleId : undefined;
};

export function UserTable({
  users,
  onStatusChange,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: UserTableProps) {
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
              <TableHead className="font-bold">User</TableHead>
              <TableHead className="font-bold">Email</TableHead>
              <TableHead className="font-bold">Organization</TableHead>
              <TableHead className="font-bold">Role</TableHead>
              <TableHead className="font-bold">Department</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Joined</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const userId = getUserId(user);
                const isActive = user.isActive !== false;
                const orgName = getOrgName(user);
                const orgId = getOrgId(user);
                const roleName = getRoleName(user);
                const roleId = getRoleId(user);

                return (
                  <TableRow key={userId}>
                    <TableCell>
                      <LinkCell
                        href={`/users/${userId}`}
                        className="flex items-center gap-3 no-underline hover:underline"
                      >
                        <Avatar className="h-10 w-10 bg-primary/10">
                          <AvatarFallback className="text-primary">
                            {user.firstName?.charAt(0)}
                            {user.lastName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          {user.userCode && (
                            <p className="text-xs font-normal text-muted-foreground no-underline">
                              ID: {user.userCode}
                            </p>
                          )}
                        </div>
                      </LinkCell>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[180px]">
                          {user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                        {orgId && orgName !== "—" ? (
                          <LinkCell
                            href={`/organizations/${orgId}`}
                            className="max-w-[140px] truncate"
                          >
                            {orgName}
                          </LinkCell>
                        ) : (
                          <span className="truncate max-w-[140px]">
                            {orgName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {roleId && roleName !== "—" ? (
                        <LinkCell href={`/roles/${roleId}`}>{roleName}</LinkCell>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {roleName}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {getUserDepartmentName(user) || "—"}
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
                        {formatDate(user.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActions user={user} onStatusChange={onStatusChange} />
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
            Showing {start}–{end} of {total} users
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
