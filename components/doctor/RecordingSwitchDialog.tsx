"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface RecordingSwitchDialogProps {
  open: boolean;
  isSwitching?: boolean;
  onContinue: () => void;
  onStopAndSwitch: () => void;
}

export function RecordingSwitchDialog({
  open,
  isSwitching = false,
  onContinue,
  onStopAndSwitch,
}: RecordingSwitchDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSwitching) {
          onContinue();
        }
      }}
    >
      <DialogContent
        showCloseButton={!isSwitching}
        className="max-w-md rounded-2xl border-gray-200 sm:max-w-md"
        onEscapeKeyDown={(event) => {
          if (isSwitching) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isSwitching) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg text-gray-900">
            Recording in Progress
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-gray-600">
          <p>
            A consultation recording is currently in progress for this patient.
          </p>
          <p>If you switch to another patient:</p>
          <ul className="list-disc space-y-1 pl-5 text-left">
            <li>Recording will stop.</li>
            <li>Audio will be uploaded automatically.</li>
            <li>Transcript processing will begin.</li>
            <li>AI Notes will be generated after processing.</li>
            <li>You can return to this consultation later.</li>
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={onContinue}
            disabled={isSwitching}
          >
            Continue Current Consultation
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full rounded-xl"
            onClick={onStopAndSwitch}
            disabled={isSwitching}
          >
            {isSwitching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Stopping &amp; Switching…
              </>
            ) : (
              "Stop Recording & Switch Patient"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
