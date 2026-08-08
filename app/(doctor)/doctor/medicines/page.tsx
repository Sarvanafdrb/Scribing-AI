"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Pill, Plus, Power, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMedicines } from "@/hooks/medicines/useMedicines";
import { useMedicineMutations } from "@/hooks/medicines/useMedicineMutations";
import { useAuthStore } from "@/store/auth.store";
import type { AuthUser } from "@/types/auth.types";
import type { Medicine } from "@/types/medicine.types";
import {
  MEDICINE_FORMS,
  MEDICINE_ROUTES,
} from "@/types/medicine.types";

type FormState = {
  name: string;
  genericName: string;
  brandName: string;
  dosageForm: string;
  strength: string;
  route: string;
  conditions: string[];
};

const emptyFields = (): FormState => ({
  name: "",
  genericName: "",
  brandName: "",
  dosageForm: "",
  strength: "",
  route: "",
  conditions: [],
});

const isDosageFormValue = (value: string) =>
  MEDICINE_FORMS.some(
    (item) => item.toLowerCase() === value.trim().toLowerCase(),
  );

const collectConditions = (listed: string[], draft: string) => {
  const next = [...listed];
  const pending = draft.trim();
  if (
    pending &&
    !next.some((item) => item.toLowerCase() === pending.toLowerCase())
  ) {
    next.push(pending);
  }
  return next;
};

const selectClassName =
  "flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35";

export default function DoctorMedicinesPage() {
  const user = useAuthStore((state) => state.user) as AuthUser | null;
  const organizationId =
    user?.organizationId ||
    user?.organization?.id ||
    user?.organization?._id ||
    "";

  const [search, setSearch] = useState("");
  const [conditionDraft, setConditionDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fields, setFields] = useState<FormState>(emptyFields());
  const [showForm, setShowForm] = useState(false);
  const genericNameTouchedRef = useRef(false);

  const medicinesQuery = useMedicines({
    organizationId: organizationId || undefined,
    search,
    page: 1,
    limit: 100,
    enabled: Boolean(organizationId),
  });

  const {
    createMedicine,
    updateMedicine,
    deactivateMedicine,
    activateMedicine,
  } = useMedicineMutations();

  const medicines = medicinesQuery.data?.medicines || [];

  const title = useMemo(
    () => (editingId ? "Edit Medicine" : "Add Medicine"),
    [editingId],
  );

  const resetFields = () => {
    genericNameTouchedRef.current = false;
    setFields(emptyFields());
    setConditionDraft("");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (medicine: Medicine) => {
    const storedGeneric = (medicine.genericName || "").trim();
    genericNameTouchedRef.current = Boolean(storedGeneric);
    setEditingId(medicine.id);
    setFields({
      name: medicine.name || "",
      genericName: isDosageFormValue(storedGeneric)
        ? medicine.name || ""
        : storedGeneric || medicine.name || "",
      brandName: medicine.brandName || "",
      dosageForm: medicine.form || "",
      strength: medicine.strength || "",
      route: medicine.route || "",
      conditions: (medicine.indications || []).map((item) => item.name),
    });
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

    let genericName = fields.genericName.trim();
    let dosageForm = fields.dosageForm.trim();
    if (isDosageFormValue(genericName)) {
      if (!dosageForm) {
        dosageForm =
          MEDICINE_FORMS.find(
            (item) => item.toLowerCase() === genericName.toLowerCase(),
          ) || dosageForm;
      }
      genericName = fields.name.trim();
    }
    if (!genericName) genericName = fields.name.trim();

    const payload = {
      organizationId,
      name: fields.name.trim(),
      genericName,
      brandName: fields.brandName.trim() || undefined,
      form: dosageForm || undefined,
      strength: fields.strength.trim() || undefined,
      route: fields.route || undefined,
      conditions,
      indications: conditions.map((name) => ({ name })),
    };

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

  const isSaving = createMedicine.isPending || updateMedicine.isPending;

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <p className="text-sm text-muted-foreground">
          Medicines are organization-scoped. Your account must belong to an
          organization to manage the formulary.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/doctor/workspace">Back to workspace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <Link
          href="/doctor/workspace"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Pill className="h-6 w-6 text-teal-700" />
              Medicine Formulary
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organization medicines and condition mappings used in Preview
              search.
            </p>
          </div>
          <Button
            type="button"
            className="rounded-full bg-teal-600 hover:bg-teal-700"
            onClick={() => {
              resetFields();
              setShowForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Medicine
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search medicines or conditions..."
          className="rounded-xl pl-9"
        />
      </div>

      {showForm ? (
        <section className="space-y-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">{title}</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={resetFields}
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
                  setFields((current) => ({
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
                  setFields((current) => ({
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
                  setFields((current) => ({
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
                  setFields((current) => ({
                    ...current,
                    dosageForm: event.target.value,
                  }))
                }
                className={selectClassName}
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
                  setFields((current) => ({
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
                  setFields((current) => ({
                    ...current,
                    route: event.target.value,
                  }))
                }
                className={selectClassName}
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
              <Label htmlFor="medicine-condition-draft">
                Applicable Conditions *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="medicine-condition-draft"
                  name="medicineConditionDraft"
                  autoComplete="off"
                  value={conditionDraft}
                  onChange={(event) => setConditionDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCondition();
                    }
                  }}
                  placeholder="e.g. Fever"
                  className="rounded-xl"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={addCondition}
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Type a condition and press Add or Enter. Unsaved text is also
                saved when you click Save Medicine.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {fields.conditions.map((condition) => (
                  <Badge
                    key={condition}
                    variant="secondary"
                    className="cursor-pointer rounded-full"
                    onClick={() =>
                      setFields((current) => ({
                        ...current,
                        conditions: current.conditions.filter(
                          (item) => item !== condition,
                        ),
                      }))
                    }
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
              onClick={resetFields}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-teal-600 hover:bg-teal-700"
              disabled={isSaving}
              onClick={() => void handleSubmit()}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Medicine
            </Button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
        {medicinesQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading medicines…
          </div>
        ) : medicines.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            No medicines in this organization yet. Add your first formulary
            item.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.map((medicine) => {
                const active = medicine.isActive !== false;
                return (
                  <TableRow key={medicine.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{medicine.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[medicine.genericName, medicine.form, medicine.route]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{medicine.strength || "—"}</TableCell>
                    <TableCell>
                      <div className="flex max-w-[240px] flex-wrap gap-1">
                        {(medicine.indications || []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          medicine.indications.slice(0, 4).map((indication) => (
                            <Badge
                              key={indication.id}
                              variant="outline"
                              className="rounded-full text-[10px] capitalize"
                            >
                              {indication.name}
                            </Badge>
                          ))
                        )}
                        {(medicine.indications || []).length > 4 ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full text-[10px]"
                          >
                            +{medicine.indications.length - 4}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={active ? "default" : "secondary"}
                        className={active ? "bg-teal-600" : undefined}
                      >
                        {active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => startEdit(medicine)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() =>
                            void (active
                              ? deactivateMedicine.mutateAsync(medicine.id)
                              : activateMedicine.mutateAsync(medicine.id))
                          }
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
