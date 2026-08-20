"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DOCTOR_DATE_PRESET_LABELS,
  formatDoctorDateRangeLabel,
  getDoctorDatePresetRange,
  type DoctorDashboardDateRange,
  type DoctorDateRangePreset,
} from "@/lib/doctor-dashboard-date-range";
import { cn } from "@/lib/utils";

interface DoctorDateRangePickerProps {
  value: DoctorDashboardDateRange;
  onChange: (value: DoctorDashboardDateRange) => void;
  className?: string;
}

const PRESETS = Object.entries(DOCTOR_DATE_PRESET_LABELS) as Array<
  [Exclude<DoctorDateRangePreset, "custom">, string]
>;

export function DoctorDateRangePicker({
  value,
  onChange,
  className,
}: DoctorDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(value.start);
  const [draftTo, setDraftTo] = useState(value.end);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftFrom(value.start);
      setDraftTo(value.end);
    }
    setOpen(nextOpen);
  };

  const applyPreset = (preset: Exclude<DoctorDateRangePreset, "custom">) => {
    onChange(getDoctorDatePresetRange(preset));
    setOpen(false);
  };

  const applyCustomRange = () => {
    if (!draftFrom || !draftTo) return;
    const start = draftFrom <= draftTo ? draftFrom : draftTo;
    const end = draftFrom <= draftTo ? draftTo : draftFrom;
    onChange({ start, end });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label="Select dashboard date range"
          className={cn(
            "glass h-10 w-full cursor-pointer gap-2 rounded-xl border-border/60 bg-card/70 px-4 text-sm font-medium text-foreground shadow-none hover:bg-card sm:w-auto",
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{formatDoctorDateRangeLabel(value)}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="glass w-[min(100vw-2rem,20rem)] border-border/60 p-0"
      >
        <div className="p-2">
          <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Quick ranges
          </p>
          <div className="space-y-1">
            {PRESETS.map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/70"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border/60 p-4">
          <p className="text-sm font-medium text-foreground">Custom range</p>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="doctor-dashboard-from">From</Label>
              <Input
                id="doctor-dashboard-from"
                type="date"
                value={draftFrom}
                max={draftTo || undefined}
                onChange={(event) => setDraftFrom(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doctor-dashboard-to">To</Label>
              <Input
                id="doctor-dashboard-to"
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(event) => setDraftTo(event.target.value)}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={applyCustomRange}
              disabled={!draftFrom || !draftTo}
            >
              Apply range
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
