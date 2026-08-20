"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DoctorShell } from "@/components/doctor/DoctorShell";
import { PatientTable } from "@/app/(admin)/patients/components/PatientTable";
import { PatientSkeleton } from "@/app/(admin)/patients/components/PatientSkeleton";
import { usePatients } from "@/hooks/patients/usePatients";
import { useSessions } from "@/hooks/sessions/useSessions";
import { useAppointments } from "@/hooks/appointments/useAppointments";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useAuthStore } from "@/store/auth.store";
import { useTenantScope } from "@/hooks/useTenantScope";
import { getPatientId } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import { cn } from "@/lib/utils";

import { readDoctorRecentlyViewedPatientIds } from "@/utils/doctorRecentlyViewed";

const PAGE_SIZE = 10;

type PatientListView =
  | "all"
  | "today"
  | "recent"
  | "active"
  | "upcoming";

const LIST_VIEWS: Array<{ id: PatientListView; label: string }> = [
  { id: "all", label: "All Patients" },
  { id: "today", label: "Today's Patients" },
  { id: "recent", label: "Recently Viewed" },
  { id: "active", label: "Active Patients" },
  { id: "upcoming", label: "Upcoming Appointments" },
];

export default function DoctorPatientsPage() {
  const { canViewPatients, canCreatePatient } = useAccessControl();
  const user = useAuthStore((state) => state.user);
  const { organizationId } = useTenantScope();
  const doctorId = String(user?.id || user?._id || "");

  const [view, setView] = useState<PatientListView>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentIds(readDoctorRecentlyViewedPatientIds());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [view, search]);

  const usesServerPagination = view === "all" || view === "active";

  const {
    patients: allPatients,
    total,
    totalPages,
    isLoading,
    error,
    refetch,
  } = usePatients({
    search: usesServerPagination ? search : undefined,
    isActive: view === "active" ? "true" : undefined,
    page: usesServerPagination ? page : 1,
    limit: PAGE_SIZE,
    enabled: canViewPatients() && usesServerPagination,
  });

  const { sessions: todaySessions, isLoading: todayLoading } = useSessions({
    userId: doctorId,
    organizationId: organizationId || undefined,
    today: "true",
    limit: 100,
    enabled: canViewPatients() && view === "today" && Boolean(doctorId),
  });

  const { appointments: upcomingAppointments, isLoading: upcomingLoading } =
    useAppointments({
      doctorId,
      organizationId: organizationId || undefined,
      upcoming: true,
      limit: 50,
      enabled: canViewPatients() && view === "upcoming" && Boolean(doctorId),
    });

  const todayPatients = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const session of todaySessions) {
      const patient =
        typeof session.patientId === "object" ? session.patientId : null;
      const id = patient ? getPatientId(patient) : "";
      if (patient && id) map.set(id, patient);
    }
    return Array.from(map.values());
  }, [todaySessions]);

  const upcomingPatients = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const apt of upcomingAppointments) {
      const patient =
        apt.patientId && typeof apt.patientId === "object"
          ? apt.patientId
          : null;
      const id = patient ? getPatientId(patient) : "";
      if (patient && id) map.set(id, patient);
    }
    return Array.from(map.values());
  }, [upcomingAppointments]);

  const { patients: recentPool, isLoading: recentLoading } = usePatients({
    page: 1,
    limit: 100,
    enabled: canViewPatients() && view === "recent" && recentIds.length > 0,
  });

  const recentFiltered = useMemo(() => {
    if (!recentIds.length) return [];
    const byId = new Map(
      recentPool.map((p) => [getPatientId(p), p] as const),
    );
    return recentIds
      .map((id) => byId.get(id))
      .filter((p): p is Patient => Boolean(p));
  }, [recentIds, recentPool]);

  const displayPatients = (() => {
    switch (view) {
      case "today":
        return todayPatients;
      case "recent":
        return recentFiltered;
      case "upcoming":
        return upcomingPatients;
      case "active":
      case "all":
      default:
        return allPatients;
    }
  })();

  const listLoading =
    usesServerPagination && isLoading
      ? true
      : view === "today" && todayLoading
        ? true
        : view === "recent" && recentLoading
          ? true
          : view === "upcoming" && upcomingLoading;

  const tableTotal = usesServerPagination ? total : displayPatients.length;
  const tableTotalPages = usesServerPagination
    ? totalPages
    : Math.max(1, Math.ceil(displayPatients.length / PAGE_SIZE));
  const tablePage = page;
  const pagedPatients = usesServerPagination
    ? displayPatients
    : displayPatients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!canViewPatients()) {
    return (
      <DoctorShell title="Patients">
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-muted-foreground">
            You do not have permission to view patients.
          </p>
        </div>
      </DoctorShell>
    );
  }

  return (
    <DoctorShell
      title="Patients"
      description="Browse organization patients by list view."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {LIST_VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              view === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search patients…"
          className="glass h-10 w-full max-w-sm rounded-full border border-border/50 px-4 text-sm"
          disabled={!usesServerPagination}
        />
        {canCreatePatient() ? (
          <Button asChild size="sm">
            <Link href="/doctor/consultations">
              <Plus className="mr-2 h-4 w-4" />
              Add via Consultations
            </Link>
          </Button>
        ) : null}
      </div>

      {listLoading ? (
        <PatientSkeleton count={5} />
      ) : error ? (
        <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
          Failed to load patients.
          <Button className="mt-4" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <PatientTable
          patients={pagedPatients}
          onStatusChange={() => refetch()}
          page={tablePage}
          totalPages={tableTotalPages}
          total={tableTotal}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          getPatientHref={(id) => `/doctor/patients/${id}`}
          actionsVariant="doctor"
        />
      )}

      {view === "recent" && !listLoading && recentIds.length === 0 ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No recently viewed patients yet. Open a consultation to populate this
          list.
        </p>
      ) : null}
    </DoctorShell>
  );
}
