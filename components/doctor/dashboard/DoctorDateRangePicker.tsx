"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DoctorDateRangePickerProps {
  start?: string;
  end?: string;
  className?: string;
}

function formatRangeLabel(start?: string, end?: string) {
  if (!start || !end) {
    return "This week";
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const startLabel = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endLabel = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

export function DoctorDateRangePicker({
  start,
  end,
  className,
}: DoctorDateRangePickerProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "glass h-10 gap-2 rounded-xl border-border/60 bg-card/70 px-4 text-sm font-medium text-foreground shadow-none hover:bg-card",
        className,
      )}
    >
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <span>{formatRangeLabel(start, end)}</span>
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
