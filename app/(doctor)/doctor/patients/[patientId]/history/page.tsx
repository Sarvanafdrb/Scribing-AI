"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SessionStatusBadge } from "@/app/(admin)/sessions/components/SessionStatusBadge";
import { DoctorShell } from "@/components/doctor/DoctorShell";
import { usePatient } from "@/hooks/patients/usePatients";
import { useAccessControl } from "@/hooks/useAccessControl";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import { getPatientFullName } from "@/utils/patient.utils";
import { recordDoctorRecentlyViewedPatient } from "@/utils/doctorRecentlyViewed";
import { getEncounterType } from "@/utils/encounter.utils";
import type { Session } from "@/types/session.types";
import type { SessionUser } from "@/types/session.types";

const PAGE_SIZE = 20;

const formatVisitDate = (session: Session) => {
  const value = session.completedAt || session.createdAt;
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const getDoctorName = (session: Session) => {
  const doctor =
    typeof session.userId === "object" ? (session.userId as SessionUser) : null;
  if (!doctor) return "—";
  const name = `Dr. ${doctor.firstName || ""} ${doctor.lastName || ""}`.trim();
  return name === "Dr." ? "—" : name;
};

const getChiefComplaint = (session: Session) => {
  const subjective = session.aiNotes?.subjective?.trim();
  if (!subjective) return "—";
  return subjective.split("\n")[0]?.trim() || "—";
};

const getDiagnosis = (session: Session) => {
  const assessment = session.aiNotes?.assessment?.trim();
  return assessment || "—";
};

export default function PatientPreviousHistoryPage() {
  const { patientId } = useParams();
  const id = String(patientId || "");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const { canViewPatients, canViewSessions } = useAccessControl();

  const { data: patient, isLoading: patientLoading } = usePatient(id);

  useEffect(() => {
    if (id) {
      recordDoctorRecentlyViewedPatient(id);
    }
  }, [id]);

  const historyQuery = useQuery({
    queryKey: sessionKeys.list({
      patientId: id,
      status: "completed",
      search,
      dateFrom,
      dateTo,
      page,
      limit: PAGE_SIZE,
      sort: "history",
    }),
    queryFn: () =>
      sessionService.getAll({
        patientId: id,
        status: "completed",
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: Boolean(id) && canViewPatients() && canViewSessions(),
    staleTime: 30 * 1000,
  });

  const sessions = historyQuery.data?.sessions || [];
  const total = historyQuery.data?.total || 0;
  const totalPages = historyQuery.data?.totalPages || 1;

  const patientName = useMemo(
    () => getPatientFullName(patient) || "Patient",
    [patient],
  );

  if (!canViewPatients()) {
    return (
      <DoctorShell title="Previous History">
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-muted-foreground">
            You do not have permission to view patients.
          </p>
        </div>
      </DoctorShell>
    );
  }

  if (!canViewSessions()) {
    return (
      <DoctorShell title="Previous History">
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-muted-foreground">
            You do not have permission to view consultation history.
          </p>
        </div>
      </DoctorShell>
    );
  }

  return (
    <DoctorShell title="Previous History">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href={`/doctor/patients/${id}`}
              className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Patient Profile
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Previous History
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {patientLoading
                ? "Loading patient…"
                : `${patientName}${patient?.patientCode ? ` · ${patient.patientCode}` : ""} · ${total} completed visit${total === 1 ? "" : "s"}`}
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full">
            Status: Completed
          </Badge>
        </div>

        <section className="glass rounded-2xl border border-border/60 p-4 sm:p-5">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search consultations…"
                className="rounded-full pl-9"
              />
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-full"
              aria-label="From date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="rounded-full"
              aria-label="To date"
            />
          </div>

          {historyQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading history…
            </div>
          ) : historyQuery.isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-12 text-center text-sm text-destructive">
              Failed to load consultation history. Please try again.
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-12 text-center text-sm text-muted-foreground">
              No completed consultation history found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visit Date</TableHead>
                      <TableHead>Encounter Type</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Chief Complaint</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => {
                      const recordId = String(session.id || session._id || "");
                      return (
                        <TableRow key={recordId}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {formatVisitDate(session)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full">
                              {getEncounterType(session)}
                            </Badge>
                          </TableCell>
                          <TableCell>{getDoctorName(session)}</TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {getChiefComplaint(session)}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate whitespace-pre-wrap">
                            {getDiagnosis(session)}
                          </TableCell>
                          <TableCell>
                            <SessionStatusBadge status={session.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                            >
                              <Link
                                href={`/doctor/workspace/${recordId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                Open
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={page <= 1 || historyQuery.isFetching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={page >= totalPages || historyQuery.isFetching}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </DoctorShell>
  );
}
