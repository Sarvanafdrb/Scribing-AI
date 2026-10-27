"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CancelAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cancellationReason: string) => Promise<void>;
  pending?: boolean;
  patientName?: string;
}

export function CancelAppointmentDialog({
  open,
  onOpenChange,
  onConfirm,
  pending = false,
  patientName,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
      setError("");
    }
  }, [open]);

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Cancellation reason is required.");
      return;
    }
    setError("");
    await onConfirm(trimmed);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <AlertDialogContent className="max-w-md sm:max-w-lg">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
          <AlertDialogDescription>
            {patientName
              ? `This will cancel the appointment for ${patientName}. This action cannot be undone.`
              : "This will cancel the appointment. This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancellation-reason">
            Cancellation reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="cancellation-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            rows={3}
            placeholder="Reason for cancellation"
            disabled={pending}
            maxLength={500}
            aria-invalid={Boolean(error)}
          />
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep Appointment</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling…
              </>
            ) : (
              "Confirm Cancellation"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
