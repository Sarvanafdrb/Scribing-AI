"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SOS_EMERGENCY_OPTIONS } from "@/constants/sos.constants";
import type { SosEmergencyType } from "@/types/sos.types";
import { useSosMutations } from "@/hooks/sos/useSosMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { cn } from "@/lib/utils";

interface DoctorSosTriggerProps {
  organizationId: string;
  patientId?: string;
  patientName?: string;
  location?: string;
}

export function DoctorSosTrigger({
  organizationId,
  patientId,
  patientName,
  location,
}: DoctorSosTriggerProps) {
  const { canTriggerSos } = useAccessControl();
  const { triggerSos } = useSosMutations(organizationId);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emergencyType, setEmergencyType] =
    useState<SosEmergencyType>("cardiac_emergency");
  const [description, setDescription] = useState("");
  const [generalEmergency, setGeneralEmergency] = useState(false);

  if (!canTriggerSos()) return null;

  const submit = async () => {
    await triggerSos.mutateAsync({
      organizationId,
      emergencyType,
      description: description.trim() || undefined,
      location: location?.trim() || undefined,
      patientId: generalEmergency ? undefined : patientId,
      generalEmergency: generalEmergency || !patientId,
    });
    setConfirmOpen(false);
    setOpen(false);
    setDescription("");
  };

  return (
    <>
      <Button
        type="button"
        className="rounded-full bg-red-600 px-4 font-semibold text-white shadow-md shadow-red-600/30 hover:bg-red-700"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="mr-1.5 h-4 w-4" />
        SOS
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">Emergency SOS</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm the emergency type before alerting hospital staff.
              {patientName ? ` Patient: ${patientName}.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-2 py-2">
            {SOS_EMERGENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setEmergencyType(option.value)}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm",
                  emergencyType === option.value
                    ? "border-red-500 bg-red-50"
                    : "border-border",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="Optional details…"
            rows={3}
          />

          {!patientId ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={generalEmergency}
                onChange={(e) => setGeneralEmergency(e.target.checked)}
              />
              General hospital emergency
            </label>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={triggerSos.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              className="rounded-full bg-red-600 hover:bg-red-700"
              onClick={() => setConfirmOpen(true)}
              disabled={triggerSos.isPending}
            >
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trigger SOS now?</AlertDialogTitle>
            <AlertDialogDescription>
              Authorized staff will be notified immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={triggerSos.isPending}>Go back</AlertDialogCancel>
            <Button
              className="rounded-full bg-red-600 hover:bg-red-700"
              disabled={triggerSos.isPending}
              onClick={() => void submit()}
            >
              {triggerSos.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Trigger SOS
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}