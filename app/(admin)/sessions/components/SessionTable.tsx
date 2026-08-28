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
import { SessionActions } from "./SessionActions";
import { SessionStatusBadge } from "./SessionStatusBadge";
import { Session, SessionUser } from "@/types/session.types";
import type { Patient } from "@/types/patient.types";
import { getPatientFullName } from "@/utils/patient.utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  User,
} from "lucide-react";
import { healthcareSolid } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

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

const getDoctorName = (userId: string | SessionUser) => {
  if (typeof userId === "object" && userId?.firstName) {
    return `${userId.firstName} ${userId.lastName || ""}`.trim();
  }
  return "—";
};

const getPatientDisplay = (patientId: string | Patient | undefined) => {
  if (!patientId || typeof patientId === "string") {
    return {
      name: "—",
      code: "—",
      id: typeof patientId === "string" ? patientId : undefined,
    };
  }

  return {
    name: getPatientFullName(patientId),
    code: patientId.patientCode || "—",
    id: patientId.id || patientId._id,
  };
};

const getDoctorId = (userId: string | SessionUser) => {
  if (typeof userId === "object") {
    return userId.id || userId._id;
  }
  return typeof userId === "string" ? userId : undefined;
};

const formatSessionType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
      <div className={cn("overflow-x-auto", healthcareSolid.card)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Consultation Code</TableHead>
              <TableHead className="font-semibold">Patient Name</TableHead>
              <TableHead className="font-semibold">Patient Code</TableHead>
              <TableHead className="font-semibold">Doctor</TableHead>
              <TableHead className="font-semibold">Consultation Type</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Created Date</TableHead>
              <TableHead className="text-right font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  No sessions found
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => {
                const sessionId = getSessionId(session);
                const isActive = session.isActive !== false;
                const patient = getPatientDisplay(session.patientId);
                const doctorName = getDoctorName(session.userId);
                const doctorId = getDoctorId(session.userId);

                return (
                  <TableRow key={sessionId}>
                    <TableCell>
                      <LinkCell href={`/sessions/${sessionId}`} mono>
                        {session.sessionCode}
                      </LinkCell>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                        {patient.id && patient.name !== "—" ? (
                          <LinkCell
                            href={`/patients/${patient.id}`}
                            className="max-w-[140px] truncate"
                          >
                            {patient.name}
                          </LinkCell>
                        ) : (
                          <span className="max-w-[140px] truncate">
                            {patient.name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {patient.id && patient.code !== "—" ? (
                        <LinkCell
                          href={`/patients/${patient.id}`}
                          mono
                          className="text-muted-foreground"
                        >
                          {patient.code}
                        </LinkCell>
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">
                          {patient.code}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Stethoscope className="h-3 w-3 shrink-0 text-muted-foreground" />
                        {doctorId && doctorName !== "—" ? (
                          <LinkCell
                            href={`/users/${doctorId}`}
                            className="max-w-[140px] truncate"
                          >
                            {doctorName}
                          </LinkCell>
                        ) : (
                          <span className="max-w-[140px] truncate">
                            {doctorName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="rounded-lg bg-blue-50 text-blue-700"
                      >
                        {formatSessionType(session.sessionType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <SessionStatusBadge status={session.status} />
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
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing {start}–{end} of {total} sessions
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
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
              className="rounded-xl"
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
