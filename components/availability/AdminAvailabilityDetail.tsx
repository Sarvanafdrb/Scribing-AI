"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTenantScope } from "@/hooks/useTenantScope";
import { availabilityService } from "@/services/availability.service";
import { DAY_LABELS } from "@/utils/availability-form.utils";
import type {
  ResolvedDayAvailability,
  WeeklyDaySchedule,
  WorkingSession,
} from "@/types/availability.types";

type AdminAvailabilityDetailProps = {
  kind: "doctors" | "staff";
  userId: string;
};

export function AdminAvailabilityDetail({
  kind,
  userId,
}: AdminAvailabilityDetailProps) {
  const { organizationId } = useTenantScope();
  const searchParams = useSearchParams();
  const filterDate = searchParams.get("date") || undefined;

  const query = useQuery({
    queryKey: ["availability", "admin", kind, userId, organizationId, filterDate],
    queryFn: () =>
      kind === "doctors"
        ? availabilityService.adminGetDoctor(organizationId!, userId, filterDate)
        : availabilityService.adminGetStaff(organizationId!, userId, filterDate),
    enabled: Boolean(organizationId && userId),
  });

  const backHref = "/availability-management";

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <p className="text-destructive">Unable to load availability details.</p>
    );
  }

  const { user, schedule, day: dayRaw } = query.data;
  const day = dayRaw as ResolvedDayAvailability | undefined;
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={backHref}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to overview
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        {kind === "doctors" ? (
          <p className="text-sm text-muted-foreground">
            {user.specialization || user.qualifications || "Doctor"}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {[user.roleId?.name, user.departmentId?.name].filter(Boolean).join(" · ")}
          </p>
        )}
        <Badge variant="outline" className="mt-2">
          Read-only (V1)
        </Badge>
      </div>

      {filterDate && day ? (
        <Card>
          <CardHeader>
            <CardTitle>Day snapshot — {filterDate}</CardTitle>
            <CardDescription>Resolved availability for the selected date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Working:{" "}
              <strong>{day.isWorking ? "Yes" : "No"}</strong>
              {day.isOnFullDayLeave ? " (full-day leave)" : ""}
            </p>
            {day.sessions?.length ? (
              <p>
                Sessions:{" "}
                {day.sessions.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}
              </p>
            ) : null}
            {day.breaks?.length ? (
              <p>
                Breaks:{" "}
                {day.breaks.map((b) => `${b.startTime}–${b.endTime}`).join(", ")}
              </p>
            ) : null}
            {kind === "doctors" ? (
              <p>Bookable for appointments: {day.isBookable ? "Yes" : "No"}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Weekly schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {!schedule?.weekly?.length ? (
            <p className="text-sm text-muted-foreground">No schedule on file.</p>
          ) : (
            <ul className="divide-y divide-border">
              {([...(schedule.weekly as WeeklyDaySchedule[])])
                .sort((a, b) => {
                  const am = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
                  const bm = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
                  return am - bm;
                })
                .map((d) => {
                  const sessions: WorkingSession[] = d.workingSessions?.length
                    ? d.workingSessions
                    : d.startTime && d.endTime
                      ? [{ startTime: d.startTime, endTime: d.endTime }]
                      : [];
                  return (
                    <li key={d.dayOfWeek} className="py-3 text-sm">
                      <p className="font-medium">
                        {DAY_LABELS[d.dayOfWeek]}{" "}
                        {!d.isWorking ? (
                          <span className="text-muted-foreground">(off)</span>
                        ) : null}
                      </p>
                      {d.isWorking && sessions.length ? (
                        <p className="text-muted-foreground">
                          Sessions:{" "}
                          {sessions
                            .map((s) => `${s.startTime}–${s.endTime}`)
                            .join(", ")}
                        </p>
                      ) : null}
                      {d.breaks?.length ? (
                        <p className="text-muted-foreground">
                          Breaks:{" "}
                          {d.breaks
                            .map((b) => `${b.startTime}–${b.endTime}`)
                            .join(", ")}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          )}
          {kind === "doctors" && schedule && "consultationMinutes" in schedule ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Consultation {schedule.consultationMinutes ?? 30} min · Buffer{" "}
              {schedule.bufferMinutes ?? 5} min
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}