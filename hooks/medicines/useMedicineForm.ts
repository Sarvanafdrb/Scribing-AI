"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useMedicineMutations } from "@/hooks/medicines/useMedicineMutations";
import type { Medicine } from "@/types/medicine.types";
import {
  buildMedicinePayload,
  collectConditions,
  emptyMedicineFormState,
  mapMedicineToFormState,
  type MedicineFormState,
} from "@/components/shared/medicine/medicineForm.utils";

export const useMedicineForm = (organizationId: string) => {
  const [conditionDraft, setConditionDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fields, setFields] = useState<MedicineFormState>(
    emptyMedicineFormState(),
  );
  const [showForm, setShowForm] = useState(false);
  const genericNameTouchedRef = useRef(false);

  const {
    createMedicine,
    updateMedicine,
    deactivateMedicine,
    activateMedicine,
  } = useMedicineMutations();

  const title = useMemo(
    () => (editingId ? "Edit Medicine" : "Add Medicine"),
    [editingId],
  );

  const resetFields = () => {
    genericNameTouchedRef.current = false;
    setFields(emptyMedicineFormState());
    setConditionDraft("");
    setEditingId(null);
    setShowForm(false);
  };

  const startCreate = () => {
    resetFields();
    setShowForm(true);
  };

  const startEdit = (medicine: Medicine) => {
    const storedGeneric = (medicine.genericName || "").trim();
    genericNameTouchedRef.current = Boolean(storedGeneric);
    setEditingId(medicine.id);
    setFields(mapMedicineToFormState(medicine));
    setShowForm(true);
  };

  const addCondition = () => {
    const next = conditionDraft.trim();
    if (!next) return;
    if (
      fields.conditions.some(
        (condition) => condition.toLowerCase() === next.toLowerCase(),
      )
    ) {
      toast.info("Condition already added");
      return;
    }
    setFields((current) => ({
      ...current,
      conditions: [...current.conditions, next],
    }));
    setConditionDraft("");
  };

  const removeCondition = (condition: string) => {
    setFields((current) => ({
      ...current,
      conditions: current.conditions.filter((item) => item !== condition),
    }));
  };

  const handleSubmit = async () => {
    if (!fields.name.trim()) {
      toast.error("Medicine name is required");
      return;
    }
    if (!organizationId) {
      toast.error("Organization is required");
      return;
    }

    const conditions = collectConditions(fields.conditions, conditionDraft);
    if (conditions.length === 0) {
      toast.error("Add at least one applicable condition before saving");
      return;
    }

    const payload = buildMedicinePayload(fields, organizationId, conditionDraft);

    try {
      if (editingId) {
        await updateMedicine.mutateAsync({ id: editingId, data: payload });
      } else {
        await createMedicine.mutateAsync(payload);
      }
      resetFields();
    } catch {
      // Toast is handled by the mutation; keep the form open for correction.
    }
  };

  const toggleStatus = async (medicine: Medicine) => {
    const active = medicine.isActive !== false;
    try {
      if (active) {
        await deactivateMedicine.mutateAsync(medicine.id);
      } else {
        await activateMedicine.mutateAsync(medicine.id);
      }
    } catch {
      // Toast handled in mutation hook.
    }
  };

  return {
    fields,
    setFields,
    conditionDraft,
    setConditionDraft,
    editingId,
    showForm,
    title,
    genericNameTouchedRef,
    resetFields,
    startCreate,
    startEdit,
    addCondition,
    removeCondition,
    handleSubmit,
    toggleStatus,
    isSaving: createMedicine.isPending || updateMedicine.isPending,
    isStatusPending:
      deactivateMedicine.isPending || activateMedicine.isPending,
  };
};
