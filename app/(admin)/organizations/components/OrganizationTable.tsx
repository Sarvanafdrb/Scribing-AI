// app/(admin)/organizations/components/OrganizationTable.tsx
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
import { OrganizationActions } from "./OrganizationActions";
import { Organization } from "@/types/organization.types";
import { Calendar, Mail, Phone, ChevronLeft, ChevronRight } from "lucide-react";

interface OrganizationTableProps {
  organizations: Organization[];
  onStatusChange: () => void;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function OrganizationTable({
  organizations,
  onStatusChange,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: OrganizationTableProps) {
  const getStatus = (org: Organization): "active" | "inactive" => {
    if (org.isActive === true) return "active";
    if (org.isActive === false) return "inactive";
    return "inactive";
  };

  const formatDate = (date?: string | Date): string => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  const getOrgId = (org: Organization): string => {
    if (org.id) return org.id;
    if (org._id) return org._id;
    if (org.organizationCode) return org.organizationCode;
    return `${org.name}-${org.email}`;
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Organization</TableHead>
              <TableHead className="font-bold">Parent</TableHead>
              <TableHead className="font-bold">Contact</TableHead>
              <TableHead className="font-bold">Plan</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Created</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No organizations found
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org) => {
                const status = getStatus(org);
                const orgId = getOrgId(org);

                return (
                  <TableRow key={orgId}>
                    <TableCell>
                      <LinkCell
                        href={`/organizations/${orgId}`}
                        className="flex items-center gap-3 no-underline hover:underline"
                      >
                        <Avatar className="h-10 w-10 bg-primary/10">
                          <AvatarFallback className="text-primary">
                            {org.name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          {org.organizationCode && (
                            <p className="text-xs font-normal text-muted-foreground no-underline">
                              ID: {org.organizationCode}
                            </p>
                          )}
                        </div>
                      </LinkCell>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const parent = org.parentOrganization;
                        const parentId = parent?.id || parent?._id;
                        if (parentId && parent?.name) {
                          return (
                            <LinkCell
                              href={`/organizations/${parentId}`}
                              className="text-sm"
                            >
                              {parent.name}
                            </LinkCell>
                          );
                        }
                        return (
                          <span className="text-sm text-muted-foreground">
                            {parent?.name || "—"}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">
                            {org.email || org.adminEmail}
                          </span>
                        </div>
                        {(org.contactNumber || org.phone) && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{org.contactNumber || org.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          org.subscriptionPlan === "premium"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          org.subscriptionPlan === "premium"
                            ? "bg-blue-700 hover:bg-blue-800"
                            : org.subscriptionPlan === "basic"
                              ? "bg-blue-500 hover:bg-blue-600"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        }
                      >
                        {org.subscriptionPlan || "free"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={status === "active" ? "default" : "secondary"}
                        className={
                          status === "active"
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                        }
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(org.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <OrganizationActions
                        organization={org}
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
            Showing {start}–{end} of {total} organizations
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
