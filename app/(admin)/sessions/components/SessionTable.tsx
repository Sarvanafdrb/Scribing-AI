"use client";

import Link from "next/link";
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
import { SessionActions } from "./SessionActions";
import { SessionStatusBadge } from "./SessionStatusBadge";
import { Session, SessionOrganization, SessionUser } from "@/types/session.types";
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
} from "lucide-react";

interface SessionTableProps {
  sessions: Session[];
  onStatusChange: () => void;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const getSessionId = (session: Session) =>
  session.id || session._id || session.sessionCode;

const getOrgName = (organizationId: string | SessionOrganization) => {
  if (typeof organizationId === "object" && organizationId?.name) {
    return organizationId.name;
  }
  return "—";
};

const getUserName = (userId: string | SessionUser) => {
  if (typeof userId === "object" && userId?.firstName) {
    return `${userId.firstName} ${userId.lastName || ""}`.trim();
  }
  return "—";
};

const formatSessionType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatDuration = (seconds?: number) => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export function SessionTable({
  sessions,
  onStatusChange,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: SessionTableProps) {
  const formatDate = (date?: string) => {
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
              <TableHead className="font-bold">Session</TableHead>
              <TableHead className="font-bold">Organization</TableHead>
              <TableHead className="font-bold">User</TableHead>
              <TableHead className="font-bold">Type</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Duration</TableHead>
              <TableHead className="font-bold">Created</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  No sessions found
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => {
                const sessionId = getSessionId(session);
                const isActive = session.isActive !== false;

                return (
                  <TableRow key={sessionId}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/sessions/${sessionId}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {session.title}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1">
                          {session.sessionCode}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[140px]">
                          {getOrgName(session.organizationId)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[140px]">
                          {getUserName(session.userId)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {formatSessionType(session.sessionType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <SessionStatusBadge status={session.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatDuration(session.duration)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(session.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isActive && (
                          <Badge variant="outline" className="text-xs">
                            inactive
                          </Badge>
                        )}
                        <SessionActions
                          session={session}
                          onStatusChange={onStatusChange}
                        />
                      </div>
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
            Showing {start}–{end} of {total} sessions
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
