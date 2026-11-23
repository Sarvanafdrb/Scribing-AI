"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { WeeklyDaySchedule } from "@/types/availability.types";
import { DAY_LABELS } from "@/utils/availability-form.utils";

type WeeklyScheduleEditorProps = {
  weekly: WeeklyDaySchedule[];
  onChange: (weekly: WeeklyDaySchedule[]) => void;
  disabled?: boolean;
  showDoctorTiming?: boolean;
  consultationMinutes?: number;
  bufferMinutes?: number;
  onConsultationMinutesChange?: (value: number) => void;
  onBufferMinutesChange?: (value: number) => void;
};

export function WeeklyScheduleEditor({
  weekly,
  onChange,
  disabled,
  showDoctorTiming,
  consultationMinutes,
  bufferMinutes,
  onConsultationMinutesChange,
  onBufferMinutesChange,
}: WeeklyScheduleEditorProps) {
  const updateDay = (
    dayOfWeek: number,
    patch: Partial<WeeklyDaySchedule>,
  ) => {
    onChange(
      weekly.map((row) =>
        row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row,
      ),
    );
  };

  const addSession = (dayOfWeek: number) => {
    onChange(
      weekly.map((row) =>
        row.dayOfWeek === dayOfWeek
          ? {
              ...row,
              workingSessions: [
                ...(row.workingSessions || []),
                { startTime: "09:00", endTime: "17:00" },
              ],
            }
          : row,
      ),
    );
  };

  const updateSession = (
    dayOfWeek: number,
    index: number,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    onChange(
      weekly.map((row) => {
        if (row.dayOfWeek !== dayOfWeek) return row;
        const sessions = [...(row.workingSessions || [])];
        sessions[index] = { ...sessions[index], [field]: value };
        return { ...row, workingSessions: sessions };
      }),
    );
  };

  const removeSession = (dayOfWeek: number, index: number) => {
    onChange(
      weekly.map((row) =>
        row.dayOfWeek === dayOfWeek
          ? {
              ...row,
              workingSessions: (row.workingSessions || []).filter(
                (_, i) => i !== index,
              ),
            }
          : row,
      ),
    );
  };

  const addBreak = (dayOfWeek: number) => {
    onChange(
      weekly.map((row) =>
        row.dayOfWeek === dayOfWeek
          ? {
              ...row,
              breaks: [
                ...(row.breaks || []),
                { startTime: "12:00", endTime: "13:00" },
              ],
            }
          : row,
      ),
    );
  };

  const updateBreak = (
    dayOfWeek: number,
    index: number,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    onChange(
      weekly.map((row) => {
        if (row.dayOfWeek !== dayOfWeek) return row;
        const breaks = [...(row.breaks || [])];
        breaks[index] = { ...breaks[index], [field]: value };
        return { ...row, breaks };
      }),
    );
  };

  const removeBreak = (dayOfWeek: number, index: number) => {
    onChange(
      weekly.map((row) =>
        row.dayOfWeek === dayOfWeek
          ? {
              ...row,
              breaks: (row.breaks || []).filter((_, i) => i !== index),
            }
          : row,
      ),
    );
  };

  const ordered = [...weekly].sort((a, b) => {
    const am = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const bm = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return am - bm;
  });

  return (
    <div className="space-y-6">
      {showDoctorTiming ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="consultation-minutes">Consultation (minutes)</Label>
            <Input
              id="consultation-minutes"
              type="number"
              min={5}
              max={480}
              disabled={disabled}
              value={consultationMinutes ?? 30}
              onChange={(e) =>
                onConsultationMinutesChange?.(Number(e.target.value) || 30)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buffer-minutes">Buffer between slots (minutes)</Label>
            <Input
              id="buffer-minutes"
              type="number"
              min={0}
              max={120}
              disabled={disabled}
              value={bufferMinutes ?? 5}
              onChange={(e) =>
                onBufferMinutesChange?.(Number(e.target.value) || 0)
              }
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {ordered.map((day) => (
          <div
            key={day.dayOfWeek}
            className="glass-row rounded-2xl border border-border/60 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                {DAY_LABELS[day.dayOfWeek]}
              </h3>
              <div className="flex items-center gap-2">
                <Label htmlFor={`working-${day.dayOfWeek}`} className="text-xs">
                  Working day
                </Label>
                <Switch
                  id={`working-${day.dayOfWeek}`}
                  disabled={disabled}
                  checked={day.isWorking}
                  onCheckedChange={(checked) =>
                    updateDay(day.dayOfWeek, {
                      isWorking: checked,
                      workingSessions: checked
                        ? day.workingSessions?.length
                          ? day.workingSessions
                          : [{ startTime: "09:00", endTime: "17:00" }]
                        : [],
                    })
                  }
                />
              </div>
            </div>

            {day.isWorking ? (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      Working sessions
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() => addSession(day.dayOfWeek)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Session
                    </Button>
                  </div>
                  {(day.workingSessions || []).map((session, idx) => (
                    <div
                      key={`${day.dayOfWeek}-session-${idx}`}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">Start</Label>
                        <Input
                          type="time"
                          disabled={disabled}
                          value={session.startTime}
                          onChange={(e) =>
                            updateSession(
                              day.dayOfWeek,
                              idx,
                              "startTime",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End</Label>
                        <Input
                          type="time"
                          disabled={disabled}
                          value={session.endTime}
                          onChange={(e) =>
                            updateSession(
                              day.dayOfWeek,
                              idx,
                              "endTime",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      {(day.workingSessions || []).length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={disabled}
                          onClick={() => removeSession(day.dayOfWeek, idx)}
                          aria-label="Remove session"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      Breaks
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() => addBreak(day.dayOfWeek)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Break
                    </Button>
                  </div>
                  {(day.breaks || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No breaks</p>
                  ) : null}
                  {(day.breaks || []).map((br, idx) => (
                    <div
                      key={`${day.dayOfWeek}-break-${idx}`}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <Input
                        type="time"
                        disabled={disabled}
                        value={br.startTime}
                        onChange={(e) =>
                          updateBreak(
                            day.dayOfWeek,
                            idx,
                            "startTime",
                            e.target.value,
                          )
                        }
                      />
                      <Input
                        type="time"
                        disabled={disabled}
                        value={br.endTime}
                        onChange={(e) =>
                          updateBreak(
                            day.dayOfWeek,
                            idx,
                            "endTime",
                            e.target.value,
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        onClick={() => removeBreak(day.dayOfWeek, idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Day off</p>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}