"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/sessions/useSession";
import { useSessionMutations } from "@/hooks/sessions/useSessionMutations";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useActiveRecordingStore } from "@/store/active-recording.store";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import { getPatientAge, getPatientFullName } from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import type { SessionVitals } from "@/types/session.types";
import { cn } from "@/lib/utils";
import { getMedicationDoseLabel } from "@/utils/prescriptionPrice.utils";

interface ConsultationRecordingSidebarProps {
  sessionId: string;
  className?: string;
}

type VitalFieldKey = "bp" | "weight" | "pulse" | "temp";

const formatVital = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
};

const parseBloodPressure = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("/").map((part) => part.trim());
  if (parts.length !== 2) {
    throw new Error("Enter BP as systolic/diastolic (e.g. 120/80).");
  }

  const systolic = Number(parts[0]);
  const diastolic = Number(parts[1]);
  if (
    !Number.isInteger(systolic) ||
    !Number.isInteger(diastolic) ||
    systolic <= 0 ||
    diastolic <= 0
  ) {
    throw new Error("Enter valid BP numbers (e.g. 120/80).");
  }

  return { systolic, diastolic };
};

const parsePositiveNumber = (value: string, label: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }

  return num;
};

export function ConsultationRecordingSidebar({
  sessionId,
  className,
}: ConsultationRecordingSidebarProps) {
  const { data: session, refetch } = useSession(sessionId);
  const { updateSession } = useSessionMutations();
  const { canEditSession } = useAccessControl();
  const { aiNotes, isLoading: notesLoading } = useAiNotes(sessionId);
  const isLocallyRecording = useActiveRecordingStore(
    (state) => state.isLocallyRecording && state.sessionId === sessionId,
  );
  const stopAndComplete = useActiveRecordingStore(
    (state) => state.stopAndComplete,
  );
  const requestNotesPreview = useEncounterUiStore(
    (state) => state.requestNotesPreview,
  );
  const [isStopping, setIsStopping] = useState(false);
  const [editingField, setEditingField] = useState<VitalFieldKey | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [savingField, setSavingField] = useState<VitalFieldKey | null>(null);

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const vitals = session?.vitals;
  const bp =
    vitals?.bloodPressure?.systolic !== undefined &&
    vitals?.bloodPressure?.diastolic !== undefined
      ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`
      : undefined;

  const canEditVitals = canEditSession();
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

  const startEditing = (field: VitalFieldKey, currentValue?: string | number) => {
    if (!canEditVitals || savingField) return;
    setEditingField(field);
    setDraftValue(
      currentValue === undefined || currentValue === null
        ? ""
        : String(currentValue),
    );
  };

  const cancelEditing = () => {
    setEditingField(null);
    setDraftValue("");
  };

  const buildVitalsPatch = (
    field: VitalFieldKey,
    value: string,
  ): SessionVitals | null => {
    switch (field) {
      case "bp": {
        const bloodPressure = parseBloodPressure(value);
        if (!bloodPressure) return null;
        return { bloodPressure };
      }
      case "weight": {
        const weight = parsePositiveNumber(value, "Weight");
        if (weight === null) return null;
        return { weight };
      }
      case "pulse": {
        const heartRate = parsePositiveNumber(value, "Pulse");
        if (heartRate === null) return null;
        return { heartRate: Math.round(heartRate) };
      }
      case "temp": {
        const temperature = parsePositiveNumber(value, "Temperature");
        if (temperature === null) return null;
        return { temperature };
      }
      default:
        return null;
    }
  };

  const saveVital = async (field: VitalFieldKey) => {
    if (!canEditVitals) return;

    const trimmed = draftValue.trim();
    const currentDisplay =
      field === "bp"
        ? bp || ""
        : field === "weight"
          ? vitals?.weight !== undefined
            ? String(vitals.weight)
            : ""
          : field === "pulse"
            ? vitals?.heartRate !== undefined
              ? String(vitals.heartRate)
              : ""
            : vitals?.temperature !== undefined
              ? String(vitals.temperature)
              : "";

    if (trimmed === currentDisplay.trim()) {
      cancelEditing();
      return;
    }

    try {
      const patch = buildVitalsPatch(field, draftValue);
      if (!patch) {
        cancelEditing();
        return;
      }

      setSavingField(field);
      await updateSession.mutateAsync({
        id: sessionId,
        data: { vitals: patch },
      });
      await refetch();
      cancelEditing();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update vitals. Please try again.";
      toast.error(message);
    } finally {
      setSavingField(null);
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
          <EditableVitalField
            label="BP"
            value={formatVital(bp)}
            placeholder="120/80"
            isEditing={editingField === "bp"}
            isSaving={savingField === "bp"}
            editable={canEditVitals}
            draftValue={draftValue}
            onDraftChange={setDraftValue}
            onStartEdit={() => startEditing("bp", bp)}
            onSave={() => void saveVital("bp")}
            onCancel={cancelEditing}
          />
          <EditableVitalField
            label="Weight (kg)"
            value={formatVital(vitals?.weight)}
            placeholder="68.5"
            isEditing={editingField === "weight"}
            isSaving={savingField === "weight"}
            editable={canEditVitals}
            draftValue={draftValue}
            onDraftChange={setDraftValue}
            onStartEdit={() => startEditing("weight", vitals?.weight)}
            onSave={() => void saveVital("weight")}
            onCancel={cancelEditing}
          />
          <EditableVitalField
            label="Pulse"
            value={formatVital(vitals?.heartRate)}
            placeholder="72"
            isEditing={editingField === "pulse"}
            isSaving={savingField === "pulse"}
            editable={canEditVitals}
            draftValue={draftValue}
            onDraftChange={setDraftValue}
            onStartEdit={() => startEditing("pulse", vitals?.heartRate)}
            onSave={() => void saveVital("pulse")}
            onCancel={cancelEditing}
          />
          <EditableVitalField
            label="Temp (°F)"
            value={formatVital(vitals?.temperature)}
            placeholder="98.6"
            isEditing={editingField === "temp"}
            isSaving={savingField === "temp"}
            editable={canEditVitals}
            draftValue={draftValue}
            onDraftChange={setDraftValue}
            onStartEdit={() => startEditing("temp", vitals?.temperature)}
            onSave={() => void saveVital("temp")}
            onCancel={cancelEditing}
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
      ) : (
        <button
          type="button"
          onClick={() => requestNotesPreview()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" />
          <span className="font-serif">Draft note and prescription</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </aside>
  );
}

function EditableVitalField({
  label,
  value,
  placeholder,
  isEditing,
  isSaving,
  editable,
  draftValue,
  onDraftChange,
  onStartEdit,
  onSave,
  onCancel,
}: {
  label: string;
  value: string;
  placeholder: string;
  isEditing: boolean;
  isSaving: boolean;
  editable: boolean;
  draftValue: string;
  onDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSave();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-background/50 px-3 py-2 transition-colors",
        editable && !isEditing && "cursor-pointer hover:border-primary/40 hover:bg-background/80",
        isEditing && "border-primary/50 ring-1 ring-primary/20",
      )}
      onClick={() => {
        if (editable && !isEditing && !isSaving) {
          onStartEdit();
        }
      }}
      onKeyDown={(event) => {
        if (!editable || isEditing) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onStartEdit();
        }
      }}
      role={editable && !isEditing ? "button" : undefined}
      tabIndex={editable && !isEditing ? 0 : undefined}
    >
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode={label.startsWith("BP") ? "text" : "decimal"}
          placeholder={placeholder}
          value={draftValue}
          disabled={isSaving}
          onChange={(event) => onDraftChange(event.target.value)}
          onBlur={onSave}
          onKeyDown={handleKeyDown}
          onClick={(event) => event.stopPropagation()}
          className="mt-1 w-full bg-transparent font-serif text-lg text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <p
            className={cn(
              "font-serif text-lg",
              value === "—" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {value}
          </p>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      )}
    </div>
  );
}
