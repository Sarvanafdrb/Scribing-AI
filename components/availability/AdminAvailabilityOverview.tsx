"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenantScope } from "@/hooks/useTenantScope";
import { availabilityService } from "@/services/availability.service";
import type { AdminAvailabilityUserRow } from "@/types/availability.types";
import { DAY_LABELS } from "@/utils/availability-form.utils";

type TabKind = "doctors" | "staff";

function userDisplayName(row: AdminAvailabilityUserRow) {
  return `${row.user.firstName || ""} ${row.user.lastName || ""}`.trim();
}

function summarizeWorkingDays(
  schedule: AdminAvailabilityUserRow["schedule"],
): string {
  if (!schedule?.weekly?.length) return "Not set";
  const days = schedule.weekly
    .filter((d) => d.isWorking)
    .map((d) => DAY_LABELS[d.dayOfWeek])
    .join(", ");
  return days || "Off";
}

function summarizeHours(schedule: AdminAvailabilityUserRow["schedule"]): string {
  if (!schedule?.weekly?.length) return "—";
  const working = schedule.weekly.find((d) => d.isWorking);
  if (!working) return "—";
  const sessions = working.workingSessions?.length
    ? working.workingSessions
    : working.startTime && working.endTime
      ? [{ startTime: working.startTime, endTime: working.endTime }]
      : [];
  if (!sessions.length) return "—";
  return sessions
    .map((s) => `${s.startTime}–${s.endTime}`)
    .join(", ");
}

function statusBadge(row: AdminAvailabilityUserRow, filterDate?: string) {
  const day = row.day;
  if (!filterDate) {
    return (
      <Badge variant="secondary">
        {scheduleIsActive(row.schedule) ? "Active schedule" : "Inactive / unset"}
      </Badge>
    );
  }
  if (!day) return <Badge variant="outline">Unknown</Badge>;
  if (day.isOnFullDayLeave || day.unavailableFull) {
    return <Badge variant="destructive">On leave / unavailable</Badge>;
  }
  if (!day.isWorking) {
    return <Badge variant="secondary">Not working</Badge>;
  }
  if (day.isBookable) {
    return <Badge className="bg-emerald-600">Available</Badge>;
  }
  return <Badge variant="outline">Limited</Badge>;
}

function scheduleIsActive(
  schedule: AdminAvailabilityUserRow["schedule"],
): boolean {
  if (!schedule) return false;
  if ("isActive" in schedule && schedule.isActive === false) return false;
  return schedule.weekly?.some((d) => d.isWorking) ?? false;
}

type ListPanelProps = {
  kind: TabKind;
  filterDate: string;
  search: string;
};

function AvailabilityListPanel({ kind, filterDate, search }: ListPanelProps) {
  const { organizationId } = useTenantScope();
  const [page, setPage] = useState(1);
  const limit = 20;

  const query = useQuery({
    queryKey: [
      "availability",
      "admin",
      kind,
      organizationId,
      page,
      filterDate,
    ],
    queryFn: () => {
      const params = {
        organizationId: organizationId!,
        page,
        limit,
        date: filterDate || undefined,
      };
      return kind === "doctors"
        ? availabilityService.adminListDoctors(params)
        : availabilityService.adminListStaff(params);
    },
    enabled: Boolean(organizationId),
  });

  const filteredItems = useMemo(() => {
    const items = query.data?.items || [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const name = userDisplayName(row).toLowerCase();
      const email = (row.user.email || "").toLowerCase();
      const extra =
        kind === "doctors"
          ? (row.user.specialization || row.user.qualifications || "").toLowerCase()
          : (
              row.user.roleId?.name ||
              row.user.departmentId?.name ||
              ""
            ).toLowerCase();
      return name.includes(q) || email.includes(q) || extra.includes(q);
    });
  }, [query.data?.items, search, kind]);

  const detailBase =
    kind === "doctors"
      ? "/availability-management/doctors"
      : "/availability-management/staff";

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <p className="py-10 text-center text-destructive">
        Failed to load availability overview.
      </p>
    );
  }

  if (!filteredItems.length) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        No {kind === "doctors" ? "doctors" : "staff"} match your filters.
      </p>
    );
  }

  const totalPages = query.data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>
                {kind === "doctors" ? "Specialization" : "Role / Dept"}
              </TableHead>
              <TableHead>Working days</TableHead>
              <TableHead>Hours (sample)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((row) => (
              <TableRow key={row.user._id}>
                <TableCell className="font-medium">
                  {userDisplayName(row)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {kind === "doctors"
                    ? row.user.specialization ||
                      row.user.qualifications ||
                      "—"
                    : [row.user.roleId?.name, row.user.departmentId?.name]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                </TableCell>
                <TableCell>{summarizeWorkingDays(row.schedule)}</TableCell>
                <TableCell>{summarizeHours(row.schedule)}</TableCell>
                <TableCell>{statusBadge(row, filterDate)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`${detailBase}/${row.user._id}${
                        filterDate ? `?date=${filterDate}` : ""
                      }`}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({query.data?.total ?? 0} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Admin overview is read-only. Staff and doctors manage their own schedules
        from My Availability.
      </p>
    </div>
  );
}

export function AdminAvailabilityOverview() {
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Availability Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only overview of doctor and staff availability for your organization.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Filter by date
          </label>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="doctors">
        <TabsList>
          <TabsTrigger value="doctors">Doctor availability</TabsTrigger>
          <TabsTrigger value="staff">Staff availability</TabsTrigger>
        </TabsList>
        <TabsContent value="doctors" className="mt-4">
          <AvailabilityListPanel
            kind="doctors"
            filterDate={filterDate}
            search={search}
          />
        </TabsContent>
        <TabsContent value="staff" className="mt-4">
          <AvailabilityListPanel
            kind="staff"
            filterDate={filterDate}
            search={search}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}