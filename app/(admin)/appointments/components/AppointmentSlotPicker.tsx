"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { appointmentService } from "@/services/appointment.service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SelectedSlot = {
  startTime: string;
  endTime: string;
};

interface AppointmentSlotPickerProps {
  organizationId: string;
  doctorId: string;
  appointmentDate: string;
  value?: SelectedSlot | null;
  onChange: (slot: SelectedSlot | null) => void;
}

export function AppointmentSlotPicker({
  organizationId,
  doctorId,
  appointmentDate,
  value,
  onChange,
}: AppointmentSlotPickerProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "appointment-slots",
      organizationId,
      doctorId,
      appointmentDate,
    ],
    queryFn: () =>
      appointmentService.getDoctorSlots(
        organizationId,
        doctorId,
        appointmentDate,
      ),
    enabled: Boolean(organizationId && doctorId && appointmentDate),
  });

  if (!organizationId || !doctorId || !appointmentDate) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a date and doctor to view available slots.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading available slots…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">Could not load slots.</p>
        <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data?.configured) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
        Doctor schedule is not configured. An administrator must set working hours
        before booking.
        <div className="mt-2">
          <Link
            href="/appointments/settings/availability"
            className="text-primary underline"
          >
            Configure doctor availability
          </Link>
        </div>
      </div>
    );
  }

  if (!data.slots?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {data.message ||
          "No available slots for this date. Please select another date."}
      </p>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      role="listbox"
      aria-label="Available appointment slots"
    >
      {data.slots.map((slot) => {
        const selected =
          value?.startTime === slot.startTime &&
          value?.endTime === slot.endTime;
        return (
          <button
            key={`${slot.startUtc}-${slot.endUtc}`}
            type="button"
            role="option"
            aria-selected={selected}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm transition",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50",
            )}
            onClick={() =>
              onChange({ startTime: slot.startTime, endTime: slot.endTime })
            }
          >
            {slot.startTime} – {slot.endTime}
          </button>
        );
      })}
    </div>
  );
}
