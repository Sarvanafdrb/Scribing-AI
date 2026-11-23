"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTenantScope } from "@/hooks/useTenantScope";
import { availabilityService } from "@/services/availability.service";
import type {
  AvailabilityExceptionType,
  AvailabilityUserType,
  ScheduleChangeWarning,
  WeeklyDaySchedule,
} from "@/types/availability.types";
import {
  defaultWeeklySchedule,
  normalizeWeeklyFromApi,
  prepareWeeklyForSave,
} from "@/utils/availability-form.utils";
import { WeeklyScheduleEditor } from "@/components/availability/WeeklyScheduleEditor";
import { ConflictWarnings } from "@/components/availability/ConflictWarnings";

type MyAvailabilityWorkspaceProps = {
  mode: AvailabilityUserType;
  title?: string;
  description?: string;
};

const EXCEPTION_LABELS: Record<AvailabilityExceptionType, string> = {
  unavailable_full: "Full day unavailable",
  unavailable_partial: "Partial day block",
  custom_hours: "Custom hours",
  leave_partial: "Partial leave",
};

function formatExceptionSummary(type: AvailabilityExceptionType, row: {
  blockedStartTime?: string;
  blockedEndTime?: string;
}) {
  if (type === "unavailable_full") return "Full day";
  if (type === "custom_hours") return "Custom working hours";
  if (row.blockedStartTime && row.blockedEndTime) {
    return `${row.blockedStartTime} – ${row.blockedEndTime}`;
  }
  return EXCEPTION_LABELS[type];
}

export function MyAvailabilityWorkspace({
  mode,
  title = "My Availability",
  description,
}: MyAvailabilityWorkspaceProps) {
  const { organizationId } = useTenantScope();
  const queryClient = useQueryClient();
  const userType = mode;

  const [weekly, setWeekly] = useState<WeeklyDaySchedule[]>(defaultWeeklySchedule());
  const [consultationMinutes, setConsultationMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(5);
  const [pendingWarnings, setPendingWarnings] = useState<ScheduleChangeWarning[]>(
    [],
  );

  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionType, setExceptionType] =
    useState<AvailabilityExceptionType>("unavailable_full");
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [exceptionReason, setExceptionReason] = useState("");
  const [customSessions, setCustomSessions] = useState([
    { startTime: "09:00", endTime: "17:00" },
  ]);

  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);

  const selfQuery = useQuery({
    queryKey: ["availability", "self", organizationId, userType],
    queryFn: () => availabilityService.getSelf(organizationId!, userType),
    enabled: Boolean(organizationId),
  });

  const exceptionsQuery = useQuery({
    queryKey: ["availability", "exceptions", organizationId, userType],
    queryFn: () => availabilityService.listExceptions(organizationId!, { userType }),
    enabled: Boolean(organizationId),
  });

  const leaveQuery = useQuery({
    queryKey: ["availability", "leave", organizationId, userType],
    queryFn: () => availabilityService.listLeave(organizationId!, userType),
    enabled: Boolean(organizationId),
  });

  useEffect(() => {
    const schedule = selfQuery.data?.schedule;
    if (!schedule) return;
    setWeekly(normalizeWeeklyFromApi(schedule.weekly));
    if (mode === "doctor" && "consultationMinutes" in schedule) {
      setConsultationMinutes(schedule.consultationMinutes ?? 30);
      setBufferMinutes(schedule.bufferMinutes ?? 5);
    }
  }, [selfQuery.data, mode]);

  const upcomingLeave = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (leaveQuery.data || [])
      .filter((l) => l.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [leaveQuery.data]);

  const activeExceptions = useMemo(
    () =>
      (exceptionsQuery.data || []).filter((e) => e.status === "active"),
    [exceptionsQuery.data],
  );

  const saveWeeklyMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        organizationId: organizationId!,
        weekly: prepareWeeklyForSave(weekly),
      };
      if (mode === "doctor") {
        return availabilityService.saveDoctorWeekly({
          ...payload,
          consultationMinutes,
          bufferMinutes,
        });
      }
      return availabilityService.saveStaffWeekly(payload);
    },
    onSuccess: (result) => {
      setPendingWarnings(result.warnings || []);
      toast.success("Weekly schedule saved");
      queryClient.invalidateQueries({ queryKey: ["availability", "self"] });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to save schedule";
      toast.error(message);
    },
  });

  const createExceptionMutation = useMutation({
    mutationFn: () => {
      const body: Parameters<typeof availabilityService.createException>[0] = {
        organizationId: organizationId!,
        userType,
        date: exceptionDate,
        exceptionType,
        reason: exceptionReason || undefined,
      };
      if (exceptionType === "custom_hours") {
        body.workingSessions = customSessions;
      }
      if (
        exceptionType === "unavailable_partial" ||
        exceptionType === "leave_partial"
      ) {
        body.blockedStartTime = blockStart;
        body.blockedEndTime = blockEnd;
      }
      return availabilityService.createException(body);
    },
    onSuccess: (result) => {
      setPendingWarnings(result.warnings || []);
      toast.success("Date override saved");
      setExceptionDate("");
      setExceptionReason("");
      queryClient.invalidateQueries({ queryKey: ["availability", "exceptions"] });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to save override";
      toast.error(message);
    },
  });

  const cancelExceptionMutation = useMutation({
    mutationFn: (exceptionId: string) =>
      availabilityService.cancelException(exceptionId, organizationId!),
    onSuccess: () => {
      toast.success("Override cancelled");
      queryClient.invalidateQueries({ queryKey: ["availability", "exceptions"] });
    },
    onError: () => toast.error("Failed to cancel override"),
  });

  const deleteExceptionMutation = useMutation({
    mutationFn: (exceptionId: string) =>
      availabilityService.deleteException(exceptionId, organizationId!),
    onSuccess: () => {
      toast.success("Override removed");
      queryClient.invalidateQueries({ queryKey: ["availability", "exceptions"] });
    },
    onError: () => toast.error("Failed to remove override"),
  });

  const saveLeaveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        organizationId: organizationId!,
        userType,
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason || undefined,
      };
      if (editingLeaveId) {
        return availabilityService.patchLeave(editingLeaveId, payload);
      }
      return availabilityService.createLeave(payload);
    },
    onSuccess: (result) => {
      setPendingWarnings(result.warnings || []);
      toast.success(editingLeaveId ? "Leave updated" : "Leave added");
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      setEditingLeaveId(null);
      queryClient.invalidateQueries({ queryKey: ["availability", "leave"] });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to save leave";
      toast.error(message);
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: (leaveId: string) =>
      availabilityService.deleteLeave(leaveId, organizationId!),
    onSuccess: () => {
      toast.success("Leave removed");
      queryClient.invalidateQueries({ queryKey: ["availability", "leave"] });
    },
    onError: () => toast.error("Failed to remove leave"),
  });

  if (!organizationId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Select an organization to manage availability.
        </CardContent>
      </Card>
    );
  }

  if (selfQuery.isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-destructive">
          Unable to load availability. You may not have access to this workspace.
        </CardContent>
      </Card>
    );
  }

  const isLoading = selfQuery.isLoading;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "staff"
              ? "Manage your staff working hours and leave. This does not control doctor appointment slots."
              : "Manage your weekly hours, breaks, overrides, and leave."}
          </p>
        )}
      </div>

      <ConflictWarnings warnings={pendingWarnings} />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="weekly" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="weekly">Weekly schedule</TabsTrigger>
            <TabsTrigger value="exceptions">Date overrides</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly availability</CardTitle>
                <CardDescription>
                  Monday through Sunday with multiple sessions and breaks per day.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <WeeklyScheduleEditor
                  weekly={weekly}
                  onChange={setWeekly}
                  showDoctorTiming={mode === "doctor"}
                  consultationMinutes={consultationMinutes}
                  bufferMinutes={bufferMinutes}
                  onConsultationMinutesChange={setConsultationMinutes}
                  onBufferMinutesChange={setBufferMinutes}
                />
                <Button
                  onClick={() => saveWeeklyMutation.mutate()}
                  disabled={saveWeeklyMutation.isPending}
                >
                  {saveWeeklyMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save weekly schedule
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exceptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add date override</CardTitle>
                <CardDescription>
                  Full-day unavailability, partial blocks, or custom hours for a
                  specific date.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={exceptionDate}
                      onChange={(e) => setExceptionDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={exceptionType}
                      onValueChange={(v) =>
                        setExceptionType(v as AvailabilityExceptionType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EXCEPTION_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(exceptionType === "unavailable_partial" ||
                  exceptionType === "leave_partial") && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Block from</Label>
                      <Input
                        type="time"
                        value={blockStart}
                        onChange={(e) => setBlockStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Block until</Label>
                      <Input
                        type="time"
                        value={blockEnd}
                        onChange={(e) => setBlockEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {exceptionType === "custom_hours" && (
                  <div className="space-y-2">
                    <Label>Working sessions</Label>
                    {customSessions.map((s, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          type="time"
                          value={s.startTime}
                          onChange={(e) =>
                            setCustomSessions((rows) =>
                              rows.map((r, i) =>
                                i === idx
                                  ? { ...r, startTime: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                        <Input
                          type="time"
                          value={s.endTime}
                          onChange={(e) =>
                            setCustomSessions((rows) =>
                              rows.map((r, i) =>
                                i === idx
                                  ? { ...r, endTime: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCustomSessions((rows) => [
                          ...rows,
                          { startTime: "09:00", endTime: "17:00" },
                        ])
                      }
                    >
                      Add session
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Reason (optional)</Label>
                  <Textarea
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button
                  onClick={() => {
                    if (!exceptionDate) {
                      toast.error("Select a date");
                      return;
                    }
                    createExceptionMutation.mutate();
                  }}
                  disabled={createExceptionMutation.isPending}
                >
                  Save override
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active overrides</CardTitle>
              </CardHeader>
              <CardContent>
                {exceptionsQuery.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : activeExceptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No date overrides.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {activeExceptions.map((row) => (
                      <li
                        key={row._id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3"
                      >
                        <div>
                          <p className="font-medium">{row.date}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatExceptionSummary(row.exceptionType, row)}
                            {row.reason ? ` — ${row.reason}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelExceptionMutation.mutate(row._id)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteExceptionMutation.mutate(row._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{editingLeaveId ? "Edit leave" : "Add leave"}</CardTitle>
                <CardDescription>
                  Full-day leave uses a date range. Partial-day blocks belong under
                  date overrides.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Reason (optional)</Label>
                  <Textarea
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <Button
                    onClick={() => {
                      if (!leaveStart || !leaveEnd) {
                        toast.error("Enter start and end dates");
                        return;
                      }
                      saveLeaveMutation.mutate();
                    }}
                    disabled={saveLeaveMutation.isPending}
                  >
                    {editingLeaveId ? "Update leave" : "Add leave"}
                  </Button>
                  {editingLeaveId ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingLeaveId(null);
                        setLeaveStart("");
                        setLeaveEnd("");
                        setLeaveReason("");
                      }}
                    >
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarOff className="h-5 w-5" />
                  Upcoming leave
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaveQuery.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : upcomingLeave.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming leave.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {upcomingLeave.map((row) => (
                      <li
                        key={row._id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3"
                      >
                        <div>
                          <p className="font-medium">
                            {row.startDate}
                            {row.endDate !== row.startDate
                              ? ` → ${row.endDate}`
                              : ""}
                          </p>
                          {row.reason ? (
                            <p className="text-xs text-muted-foreground">
                              {row.reason}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingLeaveId(row._id);
                              setLeaveStart(row.startDate);
                              setLeaveEnd(row.endDate);
                              setLeaveReason(row.reason || "");
                            }}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteLeaveMutation.mutate(row._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}