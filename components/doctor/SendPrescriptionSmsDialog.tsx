"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SendPrescriptionSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  isSending: boolean;
  onConfirm: () => void;
}

export function SendPrescriptionSmsDialog({
  open,
  onOpenChange,
  phoneNumber,
  isSending,
  onConfirm,
}: SendPrescriptionSmsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send prescription link</DialogTitle>
          <DialogDescription>
            Send prescription link to {phoneNumber}?
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          The patient will receive an SMS with a secure link to view their
          prescription. No clinical details are included in the message text.
        </p>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSending}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send SMS
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
