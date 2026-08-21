"use client";

import { useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useSession } from "@/hooks/sessions/useSession";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { useActiveRecordingStore } from "@/store/active-recording.store";
import { getPatientAge, getPatientFullName } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import { cn } from "@/lib/utils";
import { getMedicationDoseLabel } from "@/utils/prescriptionPrice.utils";

interface ConsultationRecordingSidebarProps {
  sessionId: string;
  className?: string;
}

const formatVital = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
};

export function ConsultationRecordingSidebar({
  sessionId,
  className,
}: ConsultationRecordingSidebarProps) {
  const { data: session } = useSession(sessionId);
  const { aiNotes, isLoading: notesLoading } = useAiNotes(sessionId);
  const isLocallyRecording = useActiveRecordingStore(
    (state) =>
      state.isLocallyRecording && state.sessionId === sessionId,
  );
  const stopAndComplete = useActiveRecordingStore(
    (state) => state.stopAndComplete,
  );
  const [isStopping, setIsStopping] = useState(false);

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const vitals = session?.vitals;
  const bp =
    vitals?.bloodPressure?.systolic && vitals?.bloodPressure?.diastolic
      ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`
      : undefined;

  const voiceOrders =
    aiNotes?.medications?.filter((med) => med.medicine?.trim()) || [];

  const handleStopAndDraft = async () => {
    setIsStopping(true);
    try {
      await stopAndComplete();
    } catch {
      // toast handled in recording panel
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      <section className="glass rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Voice orders captured
            </h3>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {voiceOrders.length}
          </span>
        </div>
        {notesLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : voiceOrders.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Say &quot;Scribe, add paracetamol 650 at night&quot; during the
            consultation and it lands here as a draft order.
          </p>
        ) : (
          <ul className="space-y-2">
            {voiceOrders.map((med, index) => (
              <li
                key={`${med.medicine}-${index}`}
                className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground"
              >
                {med.medicine}
                {getMedicationDoseLabel(med)
                  ? ` · ${getMedicationDoseLabel(med)}`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Vitals</h3>
        <div className="grid grid-cols-2 gap-3">
          <VitalField label="BP" value={formatVital(bp)} />
          <VitalField label="Weight (kg)" value={formatVital(vitals?.weight)} />
          <VitalField label="Pulse" value={formatVital(vitals?.heartRate)} />
          <VitalField
            label="Temp (°F)"
            value={formatVital(vitals?.temperature)}
          />
        </div>
        {patient ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {getPatientFullName(patient)}
            {getPatientAge(patient) !== null
              ? ` · ${getPatientAge(patient)} y`
              : ""}
          </p>
        ) : null}
      </section>

      {isLocallyRecording ? (
        <button
          type="button"
          disabled={isStopping}
          onClick={() => void handleStopAndDraft()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isStopping ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isStopping ? "Stopping…" : "Stop and draft everything"}
        </button>
      ) : null}
    </aside>
  );
}

function VitalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/50 px-3 py-2">
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-serif text-lg text-foreground">{value}</p>
    </div>
  );
}
