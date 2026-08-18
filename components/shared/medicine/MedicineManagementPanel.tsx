"use client";

import { useState } from "react";
import { Loader2, Pill, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useMedicines } from "@/hooks/medicines/useMedicines";
import { useMedicineForm } from "@/hooks/medicines/useMedicineForm";
import { MedicineFormPanel } from "@/components/shared/medicine/MedicineFormPanel";
import { MedicineTable } from "@/components/shared/medicine/MedicineTable";

interface MedicineManagementPanelProps {
  organizationId: string;
  organizationName?: string;
  variant?: "doctor" | "admin";
  title?: string;
  description?: string;
  pageSize?: number;
}

export function MedicineManagementPanel({
  organizationId,
  organizationName,
  variant = "admin",
  title = "Medicine Formulary",
  description = "Organization medicines and condition mappings used in prescription search.",
  pageSize = 100,
}: MedicineManagementPanelProps) {
  const [search, setSearch] = useState("");
  const { canCreateMedicine } = useAccessControl();
  const form = useMedicineForm(organizationId);

  const medicinesQuery = useMedicines({
    organizationId: organizationId || undefined,
    search,
    page: 1,
    limit: pageSize,
    enabled: Boolean(organizationId),
  });

  const medicines = medicinesQuery.data?.medicines || [];
  const total = medicinesQuery.data?.total || 0;
  const activeCount = medicinesQuery.data?.activeCount || 0;
  const inactiveCount = medicinesQuery.data?.inactiveCount || 0;
  const isDoctor = variant === "doctor";
  const primaryButtonClassName = isDoctor
    ? "rounded-full bg-teal-600 hover:bg-teal-700"
    : "rounded-full bg-blue-600 hover:bg-blue-700";

  return (
    <div className="space-y-6">
      {variant === "admin" ? (
        <>
          <div>
            <h1 className="text-3xl font-bold">Medicines</h1>
            <p className="text-muted-foreground">
              Manage organization formulary
              {organizationName ? ` • ${organizationName}` : ""} • {total} total
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {activeCount}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-500">
                  {inactiveCount}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            className={
              isDoctor
                ? "flex items-center gap-2 text-2xl font-semibold text-foreground"
                : "text-xl font-semibold"
            }
          >
            {isDoctor ? <Pill className="h-6 w-6 text-teal-700" /> : null}
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {canCreateMedicine() ? (
          <Button
            type="button"
            className={primaryButtonClassName}
            onClick={form.startCreate}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Medicine
          </Button>
        ) : null}
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

      {form.showForm ? (
        <MedicineFormPanel
          title={form.title}
          fields={form.fields}
          conditionDraft={form.conditionDraft}
          genericNameTouchedRef={form.genericNameTouchedRef}
          isSaving={form.isSaving}
          variant={variant}
          onFieldsChange={form.setFields}
          onConditionDraftChange={form.setConditionDraft}
          onAddCondition={form.addCondition}
          onRemoveCondition={form.removeCondition}
          onCancel={form.resetFields}
          onSubmit={() => void form.handleSubmit()}
        />
      ) : null}

      <MedicineTable
        medicines={medicines}
        isLoading={medicinesQuery.isLoading}
        variant={variant}
        onEdit={form.startEdit}
        onToggleStatus={form.toggleStatus}
      />

      {form.isStatusPending ? (
        <div className="sr-only" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating medicine status…
        </div>
      ) : null}
    </div>
  );
}
