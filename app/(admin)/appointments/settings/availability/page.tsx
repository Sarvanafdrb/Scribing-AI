"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
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
import { useTenantScope } from "@/hooks/useTenantScope";
import { userService } from "@/services/user.service";
import { roleService } from "@/services/role.service";
import { appointmentService } from "@/services/appointment.service";
import { api } from "@/services/api";
import { toast } from "sonner";

type WeeklyRow = {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breaks: Array<{ startTime: string; endTime: string }>;
};

const defaultWeekly = (): WeeklyRow[] =>
  Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isWorking: dayOfWeek >= 1 && dayOfWeek <= 5,
    startTime: "09:00",
    endTime: "17:00",
    breaks: [],
  }));

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DoctorAvailabilitySettingsPage() {
  const { organizationId } = useTenantScope();
  const queryClient = useQueryClient();
  const [doctorId, setDoctorId] = useState("");
  const [consultationMinutes, setConsultationMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(5);
  const [weekly, setWeekly] = useState(defaultWeekly());
  const [saving, setSaving] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const applyScheduleToForm = (schedule: {
    consultationMinutes?: number;
    bufferMinutes?: number;
    weekly?: WeeklyRow[];
  } | null) => {
    if (!schedule) {
      setWeekly(defaultWeekly());
      setConsultationMinutes(30);
      setBufferMinutes(5);
      return;
    }
    setConsultationMinutes(schedule.consultationMinutes ?? 30);
    setBufferMinutes(schedule.bufferMinutes ?? 5);
    if (Array.isArray(schedule.weekly) && schedule.weekly.length === 7) {
      setWeekly(
        schedule.weekly.map((row) => ({
          dayOfWeek: row.dayOfWeek,
          isWorking: Boolean(row.isWorking),
          startTime: row.startTime || "09:00",
          endTime: row.endTime || "17:00",
          breaks: Array.isArray(row.breaks) ? row.breaks : [],
        })),
      );
    } else {
      setWeekly(defaultWeekly());
    }
  };

  const loadDoctorSchedule = async (nextDoctorId: string) => {
    if (!organizationId || !nextDoctorId) {
      applyScheduleToForm(null);
      return;
    }
    setLoadingSchedule(true);
    try {
      const schedule = await appointmentService.getDoctorSchedule(
        organizationId,
        nextDoctorId,
      );
      applyScheduleToForm(schedule);
    } catch {
      applyScheduleToForm(null);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveSaving, setLeaveSaving] = useState(false);

  const { data: rolesData } = useQuery({
    queryKey: ["roles", "availability-settings", organizationId],
    queryFn: () => roleService.getAll(organizationId || ""),
    enabled: Boolean(organizationId),
  });

  const doctorRoleId =
    rolesData?.find((r) => r.name?.toLowerCase() === "doctor")?.id ||
    rolesData?.find((r) => r.name?.toLowerCase() === "doctor")?._id ||
    "";

  const { data: doctorsData } = useQuery({
    queryKey: ["users", "availability-doctors", organizationId, doctorRoleId],
    queryFn: () =>
      userService.getAll({
        organizationId: organizationId!,
        roleId: doctorRoleId,
        limit: 100,
        page: 1,
        isActive: "true",
      }),
    enabled: Boolean(organizationId && doctorRoleId),
  });

  const doctors = doctorsData?.users || [];

  const { data: leaveRows = [], isLoading: loadingLeave } = useQuery({
    queryKey: ["doctor-leave", organizationId, doctorId],
    queryFn: () =>
      appointmentService.listDoctorLeave(organizationId!, doctorId),
    enabled: Boolean(organizationId && doctorId),
  });

  const saveSchedule = async () => {
    if (!organizationId || !doctorId) {
      toast.error("Select a doctor");
      return;
    }
    for (const day of weekly) {
      if (!day.isWorking) continue;
      if (day.endTime <= day.startTime) {
        toast.error(`${dayLabels[day.dayOfWeek]}: end time must be after start`);
        return;
      }
      for (const br of day.breaks) {
        if (br.endTime <= br.startTime) {
          toast.error(`${dayLabels[day.dayOfWeek]}: invalid break times`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      await api.put(`/appointments/schedules/${doctorId}`, {
        organizationId,
        consultationMinutes,
        bufferMinutes,
        weekly,
      });
      toast.success("Doctor schedule saved");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to save schedule";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const addBreak = (dayOfWeek: number) => {
    setWeekly((rows) =>
      rows.map((row) =>
        row.dayOfWeek === dayOfWeek
          ? {
              ...row,
              breaks: [...row.breaks, { startTime: "12:00", endTime: "13:00" }],
            }
          : row,
      ),
    );
  };

  const removeBreak = (dayOfWeek: number, index: number) => {
    setWeekly((rows) =>
      rows.map((row) =>
        row.dayOfWeek === dayOfWeek
          ? {
              ...row,
              breaks: row.breaks.filter((_, i) => i !== index),
            }
          : row,
      ),
    );
  };

  const addLeave = async () => {
    if (!organizationId || !doctorId || !leaveStart || !leaveEnd) {
      toast.error("Enter leave start and end dates");
      return;
    }
    if (leaveEnd < leaveStart) {
      toast.error("End date must be on or after start date");
      return;
    }
    setLeaveSaving(true);
    try {
      await appointmentService.createDoctorLeave(organizationId, doctorId, {
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason.trim() || undefined,
      });
      toast.success("Leave added");
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      queryClient.invalidateQueries({
        queryKey: ["doctor-leave", organizationId, doctorId],
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to add leave";
      toast.error(message);
    } finally {
      setLeaveSaving(false);
    }
  };

  const removeLeave = async (leaveId: string) => {
    if (!organizationId) return;
    try {
      await appointmentService.deleteDoctorLeave(organizationId, leaveId);
      toast.success("Leave removed");
      queryClient.invalidateQueries({
        queryKey: ["doctor-leave", organizationId, doctorId],
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to remove leave";
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/appointments">
        <Button variant="ghost" className="rounded-xl pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Appointments
        </Button>
      </Link>

      <div className="glass space-y-6 rounded-3xl p-6">
        <div>
          <h1 className="text-2xl font-bold">Doctor availability</h1>
          <p className="text-sm text-muted-foreground">
            Configure working hours, breaks, and leave. Existing booked
            appointments are not changed or cancelled when you update this
            schedule.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Doctor</Label>
          <Select
            value={doctorId}
            onValueChange={(value) => {
              setDoctorId(value);
              void loadDoctorSchedule(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doc) => (
                <SelectItem
                  key={String(doc.id || doc._id)}
                  value={String(doc.id || doc._id)}
                >
                  {doc.firstName} {doc.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loadingSchedule && doctorId ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading schedule…
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Consultation (minutes)</Label>
            <Input
              type="number"
              min={5}
              max={480}
              value={consultationMinutes}
              onChange={(e) => setConsultationMinutes(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Buffer between slots (minutes)</Label>
            <Input
              type="number"
              min={0}
              max={120}
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label>Weekly working hours</Label>
          {weekly.map((day) => (
            <div
              key={day.dayOfWeek}
              className="rounded-xl border border-border/50 p-3 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 w-24">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-input"
                    checked={day.isWorking}
                    onChange={(e) =>
                      setWeekly((rows) =>
                        rows.map((row) =>
                          row.dayOfWeek === day.dayOfWeek
                            ? { ...row, isWorking: e.target.checked }
                            : row,
                        ),
                      )
                    }
                  />
                  <span className="text-sm font-medium">
                    {dayLabels[day.dayOfWeek]}
                  </span>
                </div>
                <Input
                  type="time"
                  className="w-[130px]"
                  value={day.startTime}
                  disabled={!day.isWorking}
                  onChange={(e) =>
                    setWeekly((rows) =>
                      rows.map((row) =>
                        row.dayOfWeek === day.dayOfWeek
                          ? { ...row, startTime: e.target.value }
                          : row,
                      ),
                    )
                  }
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  className="w-[130px]"
                  value={day.endTime}
                  disabled={!day.isWorking}
                  onChange={(e) =>
                    setWeekly((rows) =>
                      rows.map((row) =>
                        row.dayOfWeek === day.dayOfWeek
                          ? { ...row, endTime: e.target.value }
                          : row,
                      ),
                    )
                  }
                />
                {day.isWorking ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    onClick={() => addBreak(day.dayOfWeek)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Break
                  </Button>
                ) : null}
              </div>
              {day.isWorking && day.breaks.length > 0 ? (
                <div className="ml-8 space-y-2">
                  {day.breaks.map((br, index) => (
                    <div
                      key={`${day.dayOfWeek}-break-${index}`}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">Break</span>
                      <Input
                        type="time"
                        className="w-[120px]"
                        value={br.startTime}
                        onChange={(e) =>
                          setWeekly((rows) =>
                            rows.map((row) =>
                              row.dayOfWeek === day.dayOfWeek
                                ? {
                                    ...row,
                                    breaks: row.breaks.map((b, i) =>
                                      i === index
                                        ? { ...b, startTime: e.target.value }
                                        : b,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                      <span>–</span>
                      <Input
                        type="time"
                        className="w-[120px]"
                        value={br.endTime}
                        onChange={(e) =>
                          setWeekly((rows) =>
                            rows.map((row) =>
                              row.dayOfWeek === day.dayOfWeek
                                ? {
                                    ...row,
                                    breaks: row.breaks.map((b, i) =>
                                      i === index
                                        ? { ...b, endTime: e.target.value }
                                        : b,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBreak(day.dayOfWeek, index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <Button
          type="button"
          className="rounded-full bg-blue-600 hover:bg-blue-700"
          disabled={saving || !doctorId}
          onClick={() => void saveSchedule()}
        >
          {saving ? "Saving…" : "Save schedule"}
        </Button>
      </div>

      <div className="glass space-y-4 rounded-3xl p-6">
        <div>
          <h2 className="text-lg font-semibold">Doctor leave</h2>
          <p className="text-sm text-muted-foreground">
            Leave blocks new bookings on those dates. Appointments already
            scheduled are not automatically cancelled.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input
              type="date"
              value={leaveStart}
              onChange={(e) => setLeaveStart(e.target.value)}
              disabled={!doctorId}
            />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <Input
              type="date"
              value={leaveEnd}
              onChange={(e) => setLeaveEnd(e.target.value)}
              disabled={!doctorId}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Reason (optional)</Label>
          <Textarea
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            disabled={!doctorId}
            rows={2}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled={leaveSaving || !doctorId}
          onClick={() => void addLeave()}
        >
          {leaveSaving ? "Adding…" : "Add leave period"}
        </Button>

        {loadingLeave && doctorId ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading leave…
          </div>
        ) : null}

        {leaveRows.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {leaveRows.map((leave) => {
              const leaveId = String(leave._id || leave.id || "");
              return (
                <li
                  key={leaveId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">
                      {leave.startDate} – {leave.endDate}
                    </p>
                    {leave.reason ? (
                      <p className="text-muted-foreground">{leave.reason}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void removeLeave(leaveId)}
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : doctorId ? (
          <p className="text-sm text-muted-foreground">No leave periods.</p>
        ) : null}
      </div>
    </div>
  );
}
