"use client";

import type { MutableRefObject } from "react";
import { Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MEDICINE_FORMS,
  MEDICINE_ROUTES,
} from "@/types/medicine.types";
import {
  medicineSelectClassName,
  type MedicineFormState,
} from "@/components/shared/medicine/medicineForm.utils";
import { cn } from "@/lib/utils";

interface MedicineFormPanelProps {
  title: string;
  fields: MedicineFormState;
  conditionDraft: string;
  genericNameTouchedRef: MutableRefObject<boolean>;
  isSaving: boolean;
  variant?: "doctor" | "admin";
  onFieldsChange: React.Dispatch<React.SetStateAction<MedicineFormState>>;
  onConditionDraftChange: (value: string) => void;
  onAddCondition: () => void;
  onRemoveCondition: (condition: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function MedicineFormPanel({
  title,
  fields,
  conditionDraft,
  genericNameTouchedRef,
  isSaving,
  variant = "admin",
  onFieldsChange,
  onConditionDraftChange,
  onAddCondition,
  onRemoveCondition,
  onCancel,
  onSubmit,
}: MedicineFormPanelProps) {
  const isDoctor = variant === "doctor";
  const sectionClassName = isDoctor
    ? "space-y-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5"
    : "space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5";
  const primaryButtonClassName = isDoctor
    ? "rounded-full bg-teal-600 hover:bg-teal-700"
    : "rounded-full bg-blue-600 hover:bg-blue-700";

  return (
    <section className={sectionClassName}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={onCancel}
        >
          <X className="mr-1 h-4 w-4" />
          Close
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="medicine-name">Medicine Name *</Label>
          <Input
            id="medicine-name"
            name="medicineName"
            autoComplete="off"
            value={fields.name}
            onChange={(event) => {
              const nextName = event.target.value;
              onFieldsChange((current) => ({
                ...current,
                name: nextName,
                genericName: genericNameTouchedRef.current
                  ? current.genericName
                  : nextName,
              }));
            }}
            placeholder="e.g. Paracetamol"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="medicine-generic-name">Generic Name</Label>
          <Input
            id="medicine-generic-name"
            name="medicineGenericName"
            autoComplete="off"
            value={fields.genericName}
            onChange={(event) => {
              genericNameTouchedRef.current = true;
              onFieldsChange((current) => ({
                ...current,
                genericName: event.target.value,
              }));
            }}
            placeholder="e.g. Paracetamol"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="medicine-brand-name">Brand Name</Label>
          <Input
            id="medicine-brand-name"
            name="medicineBrandName"
            autoComplete="off"
            value={fields.brandName}
            onChange={(event) =>
              onFieldsChange((current) => ({
                ...current,
                brandName: event.target.value,
              }))
            }
            placeholder="e.g. Calpol"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="medicine-dosage-form">Form</Label>
          <select
            id="medicine-dosage-form"
            name="medicineDosageForm"
            value={fields.dosageForm}
            onChange={(event) =>
              onFieldsChange((current) => ({
                ...current,
                dosageForm: event.target.value,
              }))
            }
            className={medicineSelectClassName}
          >
            <option value="">Select form</option>
            {MEDICINE_FORMS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="medicine-strength">Strength</Label>
          <Input
            id="medicine-strength"
            name="medicineStrength"
            autoComplete="off"
            value={fields.strength}
            onChange={(event) =>
              onFieldsChange((current) => ({
                ...current,
                strength: event.target.value,
              }))
            }
            placeholder="e.g. 500 mg"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="medicine-route">Route</Label>
          <select
            id="medicine-route"
            name="medicineRoute"
            value={fields.route}
            onChange={(event) =>
              onFieldsChange((current) => ({
                ...current,
                route: event.target.value,
              }))
            }
            className={medicineSelectClassName}
          >
            <option value="">Select route</option>
            {MEDICINE_ROUTES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="medicine-condition-draft">Applicable Conditions *</Label>
          <div className="flex gap-2">
            <Input
              id="medicine-condition-draft"
              name="medicineConditionDraft"
              autoComplete="off"
              value={conditionDraft}
              onChange={(event) => onConditionDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddCondition();
                }
              }}
              placeholder="e.g. Fever"
              className="rounded-xl"
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={onAddCondition}
            >
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Type a condition and press Add or Enter. Unsaved text is also saved
            when you click Save Medicine.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {fields.conditions.map((condition) => (
              <Badge
                key={condition}
                variant="secondary"
                className="cursor-pointer rounded-full"
                onClick={() => onRemoveCondition(condition)}
              >
                {condition}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className={cn("rounded-full", primaryButtonClassName)}
          disabled={isSaving}
          onClick={() => void onSubmit()}
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Medicine
        </Button>
      </div>
    </section>
  );
}
