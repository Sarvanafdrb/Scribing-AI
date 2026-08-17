"use client";

import { useState } from "react";
import { toast } from "sonner";
import { OrganizationInlineField } from "@/app/(admin)/organizations/components/OrganizationInlineField";
import { LinkCell } from "@/components/shared/LinkCell";
import { Badge } from "@/components/ui/badge";
import type { Department, UpdateDepartmentData } from "@/types/department.types";

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
};

interface DepartmentDetailsTabProps {
  department: Department;
  departmentId: string;
  canEdit: boolean;
  onUpdateField: (data: UpdateDepartmentData) => Promise<void>;
}

export function DepartmentDetailsTab({
  department,
  departmentId,
  canEdit,
  onUpdateField,
}: DepartmentDetailsTabProps) {
  const [savingField, setSavingField] = useState<string | null>(null);
  const isActive = department.isActive !== false;
  const organizationId = department.organizationId || "";

  const saveField = async (
    fieldKey: string,
    payload: UpdateDepartmentData,
  ) => {
    if (!canEdit) {
      toast.info("You don't have permission to edit this department.");
      return;
    }
    setSavingField(fieldKey);
    try {
      await onUpdateField(payload);
    } finally {
      setSavingField(null);
    }
  };

  const leftFields = (
    <>
      <OrganizationInlineField
        label="Department Name"
        value={department.name || ""}
        editable={canEdit}
        isSaving={savingField === "name"}
        onSave={async (value) => {
          if (!value.trim()) {
            toast.error("Department name is required.");
            return;
          }
          await saveField("name", { name: value.trim() });
        }}
      />
      <OrganizationInlineField
        label="Description"
        value={department.description || ""}
        editable={canEdit}
        type="textarea"
        isSaving={savingField === "description"}
        onSave={async (value) => {
          await saveField("description", {
            description: value.trim() || undefined,
          });
        }}
        displayValue={department.description || "—"}
      />
      <OrganizationInlineField
        label="Organization"
        value={department.organizationName || ""}
        editable={false}
        displayValue={
          organizationId && department.organizationName ? (
            <LinkCell href={`/organizations/${organizationId}`}>
              {department.organizationName}
            </LinkCell>
          ) : (
            "—"
          )
        }
      />
    </>
  );

  const rightFields = (
    <>
      <OrganizationInlineField
        label="Department ID"
        value={department.departmentCode || departmentId}
        editable={false}
        displayValue={
          <span className="font-mono text-xs">
            {department.departmentCode || departmentId}
          </span>
        }
      />
      <OrganizationInlineField
        label="Users"
        value={String(department.userCount ?? 0)}
        editable={false}
      />
      <OrganizationInlineField
        label="Status"
        value={isActive ? "Active" : "Inactive"}
        editable={false}
        displayValue={
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={isActive ? "bg-primary" : undefined}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        }
      />
      <OrganizationInlineField
        label="Created At"
        value={formatDateTime(department.createdAt)}
        editable={false}
      />
      <OrganizationInlineField
        label="Last Updated"
        value={formatDateTime(department.updatedAt)}
        editable={false}
      />
    </>
  );

  return (
    <div className="glass rounded-3xl p-4 sm:p-6">
      <h2 className="mb-1 text-base font-semibold text-foreground">
        Department Information
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Click the pencil to edit a field inline. Changes save without leaving
        this page.
      </p>
      <dl className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
        <div>{leftFields}</div>
        <div>{rightFields}</div>
      </dl>
    </div>
  );
}
