"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PatientCombobox } from "@/app/(admin)/sessions/components/PatientCombobox";
import { SOS_EMERGENCY_OPTIONS } from "@/constants/sos.constants";
import type { SosEmergencyType } from "@/types/sos.types";
import { cn } from "@/lib/utils";

interface SosTriggerFormProps {
  organizationId: string;
  defaultPatientId?: string;
  defaultPatientName?: string;
  defaultLocation?: string;
  submitError?: string | null;
  onSubmit: (payload: {
    emergencyType: SosEmergencyType;
    description?: string;
    location?: string;
    patientId?: string;
    generalEmergency?: boolean;
  }) => Promise<void>;
  pending?: boolean;
}

export function SosTriggerForm({
  organizationId,
  defaultPatientId,
  defaultPatientName,
  defaultLocation,
  onSubmit,
  pending,
  submitError,
}: SosTriggerFormProps) {
  const [patientId, setPatientId] = useState(defaultPatientId || "");
  const [generalEmergency, setGeneralEmergency] = useState(false);
  const [emergencyType, setEmergencyType] =
    useState<SosEmergencyType>("cardiac_emergency");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(defaultLocation || "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (defaultPatientId) {
      setPatientId(defaultPatientId);
      setGeneralEmergency(false);
    }
  }, [defaultPatientId]);

  const handleTrigger = async () => {
    await onSubmit({
      emergencyType,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      patientId: generalEmergency ? undefined : patientId || undefined,
      generalEmergency,
    });
    setConfirmOpen(false);
    setDescription("");
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-red-600" />
        <h2 className="text-lg font-semibold">Emergency Alert</h2>
      </div>

      <ol className="space-y-5">
        <li>
          <p className="mb-2 text-sm font-medium">1. Select Patient</p>
          <PatientCombobox
            organizationId={organizationId}
            value={patientId}
            onChange={setPatientId}
            returnTo="/sos-emergency"
            disabled={generalEmergency}
          />
          {defaultPatientName ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Linked patient: {defaultPatientName}
            </p>
          ) : null}
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={generalEmergency}
              onChange={(e) => setGeneralEmergency(e.target.checked)}
            />
            General hospital emergency (no patient selected)
          </label>
        </li>

        <li>
          <p className="mb-2 text-sm font-medium">2. Emergency Type</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SOS_EMERGENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setEmergencyType(option.value)}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm transition-colors",
                  emergencyType === option.value
                    ? "border-red-500 bg-red-50"
                    : "border-border hover:border-red-200",
                )}
              >
                <p className="font-medium">{option.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </li>

        <li>
          <p className="mb-2 text-sm font-medium">3. Additional Details (Optional)</p>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="Enter any additional details…"
            rows={3}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {description.length}/500
          </p>
        </li>

        <li>
          <Label htmlFor="sos-location">Location (optional)</Label>
          <Input
            id="sos-location"
            className="mt-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Room, ward, OPD…"
          />
        </li>
      </ol>

      <Button
        type="button"
        className="mt-6 w-full rounded-full bg-red-600 py-6 text-base font-semibold hover:bg-red-700"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        {pending ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <Bell className="mr-2 h-5 w-5" />
        )}
        Trigger SOS Alert
      </Button>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-red-700">Confirm SOS alert?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will immediately notify the emergency response team.
            </p>
            {submitError ? (
              <p className="mt-3 text-sm font-medium text-red-600" role="alert">
                {submitError}
              </p>
            ) : null}
            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setConfirmOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-full bg-red-600 hover:bg-red-700"
                onClick={() => void handleTrigger()}
                disabled={pending}
              >
                Confirm SOS
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}