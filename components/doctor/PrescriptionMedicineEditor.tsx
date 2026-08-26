"use client";

import { Sparkles, X } from "lucide-react";
import { MedicationConditionSearch } from "@/components/ai-notes/MedicationConditionSearch";
import { MedicationCostBreakdown } from "@/components/shared/prescription/MedicationCostBreakdown";
import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { MedicineSearchResult } from "@/types/medicine.types";
import { cn } from "@/lib/utils";

const WHEN_OPTIONS = [
  "After food",
  "Before food",
  "At night",
  "As directed",
  "Empty stomach",
];

interface PrescriptionMedicineEditorProps {
  medications: AiNotesMedication[];
  organizationId?: string;
  onChange: (medications: AiNotesMedication[]) => void;
  onAddFromCatalog: (medicine: MedicineSearchResult) => void;
  onAddManualMedication?: (
    medication: AiNotesMedication,
  ) => void | Promise<void>;
}

const ScheduleSlot = ({
  value,
  label,
  onClick,
}: {
  value: string;
  label: string;
  onClick: () => void;
}) => {
  const active = value === "1" || Number(value) > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
      )}
    >
      {active ? value || "1" : "0"}
    </button>
  );
};

export function PrescriptionMedicineEditor({
  medications,
  organizationId,
  onChange,
  onAddFromCatalog,
  onAddManualMedication,
}: PrescriptionMedicineEditorProps) {
  const excludedMedicineIds = medications
    .map((med) => med.medicineId || "")
    .filter(Boolean);

  const updateMedication = (
    index: number,
    patch: Partial<AiNotesMedication>,
  ) => {
    onChange(
      medications.map((med, medIndex) =>
        medIndex === index ? { ...med, ...patch } : med,
      ),
    );
  };

  const toggleSlot = (
    index: number,
    slot: "morning" | "afternoon" | "night",
  ) => {
    const med = medications[index];
    if (!med) return;
    const current = med[slot] === "1" || Number(med[slot]) > 0;
    updateMedication(index, { [slot]: current ? "0" : "1" });
  };

  const removeMedication = (index: number) => {
    onChange(medications.filter((_, medIndex) => medIndex !== index));
  };

  return (
    <div className="min-w-0 space-y-4 px-5 py-4">
      {medications.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing added yet. Accept a suggestion above, or search below.
        </p>
      ) : (
        <>
          <div className="hidden min-w-0 gap-3 overflow-x-auto border-b border-border/50 pb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase xl:grid xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_2rem]">
            <span>Drug</span>
            <span>Strength</span>
            <span>Schedule</span>
            <span>When</span>
            <span>Duration</span>
            <span />
          </div>

          <ul className="space-y-3">
            {medications.map((med, index) => {
              const genericName =
                med.medicineNameSnapshot || med.medicine.split(" ")[0] || med.medicine;
              const brandName = med.brandNameSnapshot?.trim();
              const form = med.formSnapshot?.trim() || "Tablet";

              return (
                <li
                  key={`${med.medicineId || med.medicine}-${index}`}
                  className="min-w-0 rounded-2xl border border-border/60 bg-background/80 p-3"
                >
                  <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_2rem] xl:items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {genericName}
                      </p>
                      {brandName ? (
                        <p className="text-xs text-muted-foreground">
                          {brandName} · {form}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{form}</p>
                      )}
                      <MedicationCostBreakdown
                        medication={med}
                        variant="compact"
                      />
                    </div>

                    <input
                      value={med.strengthSnapshot || ""}
                      onChange={(event) =>
                        updateMedication(index, {
                          strengthSnapshot: event.target.value,
                          medicine: `${genericName} ${event.target.value}`.trim(),
                        })
                      }
                      placeholder="Strength"
                      className="min-w-0 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
                    />

                    <div className="flex min-w-0 items-center gap-1.5">
                      <ScheduleSlot
                        label="Morning"
                        value={med.morning || "0"}
                        onClick={() => toggleSlot(index, "morning")}
                      />
                      <ScheduleSlot
                        label="Afternoon"
                        value={med.afternoon || "0"}
                        onClick={() => toggleSlot(index, "afternoon")}
                      />
                      <ScheduleSlot
                        label="Night"
                        value={med.night || "0"}
                        onClick={() => toggleSlot(index, "night")}
                      />
                    </div>

                    <select
                      value={med.instructions || "After food"}
                      onChange={(event) =>
                        updateMedication(index, {
                          instructions: event.target.value,
                        })
                      }
                      className="min-w-0 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
                    >
                      {WHEN_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <input
                      value={med.days || ""}
                      onChange={(event) =>
                        updateMedication(index, { days: event.target.value })
                      }
                      placeholder="Ongoing"
                      className="min-w-0 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
                    />

                    <button
                      type="button"
                      onClick={() => removeMedication(index)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      aria-label="Remove medicine"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="space-y-3 border-t border-border/50 pt-4">
        <div>
          <label className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            <Sparkles className="h-3 w-3 text-primary" />
            Type it the way you&apos;d write it
          </label>
          <input
            placeholder={'e.g. "pcm 650 tds 5d" or "azithro 500 od 3 days af"'}
            className="mt-2 w-full rounded-2xl border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/40"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const value = event.currentTarget.value.trim();
              if (!value) return;
              const manualMedication: AiNotesMedication = {
                medicine: value,
                medicineNameSnapshot: value,
                strengthSnapshot: "",
                formSnapshot: "Tablet",
                morning: "1",
                afternoon: "0",
                night: "0",
                days: "5",
                instructions: "After food",
              };
              if (onAddManualMedication) {
                void onAddManualMedication(manualMedication);
              } else {
                onChange([...medications, manualMedication]);
              }
              event.currentTarget.value = "";
            }}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Or search the list
          </label>
          <div className="mt-2">
            <MedicationConditionSearch
              organizationId={organizationId}
              excludedMedicineIds={excludedMedicineIds}
              onAdd={onAddFromCatalog}
              className="max-w-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
