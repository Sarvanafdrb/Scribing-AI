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
import { PatientActions } from "./PatientActions";
import { Patient } from "@/types/patient.types";
import { getPatientAge, getPatientFullName } from "@/utils/patient.utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { healthcareSolid } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

interface PatientTableProps {
  patients: Patient[];
  onStatusChange: () => void;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  getPatientHref?: (patientId: string) => string;
  actionsVariant?: "admin" | "doctor";
}

const formatGender = (gender?: string) => {
  if (!gender) return "—";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

export function PatientTable({
  patients,
  onStatusChange,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  getPatientHref = (patientId) => `/patients/${patientId}`,
  actionsVariant = "admin",
}: PatientTableProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div className={cn("overflow-hidden", healthcareSolid.card)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Patient Code</TableHead>
              <TableHead className="font-semibold">Full Name</TableHead>
              <TableHead className="font-semibold">Age</TableHead>
              <TableHead className="font-semibold">Gender</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  No patients found
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => {
                const patientId = patient.id || patient._id || "";
                const isActive = patient.isActive !== false;
                const age = getPatientAge(patient);
                const profileHref = getPatientHref(patientId);

                return (
                  <TableRow key={patientId}>
                    <TableCell>
                      <LinkCell href={profileHref} mono>
                        {patient.patientCode}
                      </LinkCell>
                    </TableCell>
                    <TableCell>
                      <LinkCell href={profileHref}>
                        {getPatientFullName(patient)}
                      </LinkCell>
                    </TableCell>
                    <TableCell>{age !== null ? age : "—"}</TableCell>
                    <TableCell>{formatGender(patient.gender)}</TableCell>
                    <TableCell className="text-sm">{patient.phoneNumber}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                      {patient.email || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          isActive
                            ? "rounded-lg bg-blue-600 hover:bg-blue-700"
                            : "rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }
                      >
                        {isActive ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <PatientActions
                        patient={patient}
                        onStatusChange={onStatusChange}
                        variant={actionsVariant}
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
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing {start}–{end} of {total} patients
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
