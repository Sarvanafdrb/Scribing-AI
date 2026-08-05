"use client";

import { useState } from "react";
import { OrganizationInlineField } from "./OrganizationInlineField";
import type {
  Organization,
  UpdateOrganizationData,
} from "@/types/organization.types";
import { Badge } from "@/components/ui/badge";
import { LinkCell } from "@/components/shared/LinkCell";

const ORGANIZATION_TYPES = [
  { value: "hospital", label: "Hospital" },
  { value: "clinic", label: "Clinic" },
  { value: "private_practice", label: "Private Practice" },
  { value: "diagnostic_center", label: "Diagnostic Center" },
  { value: "telemedicine", label: "Telemedicine" },
];

const PROVIDER_COUNTS = [
  { value: "1-5", label: "1-5" },
  { value: "6-10", label: "6-10" },
  { value: "11-20", label: "11-20" },
  { value: "21-50", label: "21-50" },
  { value: "50+", label: "50+" },
];

const formatLabel = (value?: string) => {
  if (!value) return "";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatDateTime = (date?: string | Date) => {
  if (!date) return "";
  try {
    return new Date(date).toLocaleString();
  } catch {
    return "";
  }
};

interface OrganizationDetailsTabProps {
  organization: Organization;
  organizationId: string;
  canEdit: boolean;
  onUpdateField: (data: UpdateOrganizationData) => Promise<void>;
}

export function OrganizationDetailsTab({
  organization,
  organizationId,
  canEdit,
  onUpdateField,
}: OrganizationDetailsTabProps) {
  const [savingField, setSavingField] = useState<string | null>(null);

  const saveField = async (
    fieldKey: string,
    payload: UpdateOrganizationData,
  ) => {
    setSavingField(fieldKey);
    try {
      await onUpdateField(payload);
    } finally {
      setSavingField(null);
    }
  };

  const parent = organization.parentOrganization;
  const parentId = parent?.id || parent?._id || "";
  const contact =
    organization.contactNumber || organization.phone || "";
  const adminEmail = organization.adminEmail || organization.email || "";
  const isActive = organization.isActive !== false;

  const leftFields = (
    <>
      <OrganizationInlineField
        label="Organization Name"
        value={organization.name || ""}
        editable={canEdit}
        isSaving={savingField === "name"}
        onSave={(value) => saveField("name", { name: value })}
      />
      <OrganizationInlineField
        label="Organization Type"
        value={organization.organizationType || ""}
        displayValue={formatLabel(organization.organizationType) || undefined}
        editable={canEdit}
        type="select"
        options={ORGANIZATION_TYPES}
        isSaving={savingField === "organizationType"}
        onSave={(value) =>
          saveField("organizationType", {
            organizationType: value as UpdateOrganizationData["organizationType"],
          })
        }
      />
      <OrganizationInlineField
        label="Admin Name"
        value={organization.adminName || ""}
        editable={canEdit}
        isSaving={savingField === "adminName"}
        onSave={(value) => saveField("adminName", { adminName: value })}
      />
      <OrganizationInlineField
        label="Admin Email"
        value={adminEmail}
        editable={canEdit}
        type="email"
        isSaving={savingField === "adminEmail"}
        onSave={(value) => saveField("adminEmail", { adminEmail: value })}
        displayValue={
          adminEmail ? (
            <a
              href={`mailto:${adminEmail}`}
              className="text-primary underline-offset-2 hover:underline"
            >
              {adminEmail}
            </a>
          ) : undefined
        }
      />
      <OrganizationInlineField
        label="Contact Number"
        value={contact}
        editable={canEdit}
        isSaving={savingField === "contactNumber"}
        onSave={(value) => saveField("contactNumber", { contactNumber: value })}
      />
      <OrganizationInlineField
        label="Speciality"
        value={organization.speciality || ""}
        editable={canEdit}
        isSaving={savingField === "speciality"}
        onSave={(value) => saveField("speciality", { speciality: value })}
      />
      <OrganizationInlineField
        label="Provider Count"
        value={organization.providerCount || ""}
        editable={canEdit}
        type="select"
        options={PROVIDER_COUNTS}
        isSaving={savingField === "providerCount"}
        onSave={(value) => saveField("providerCount", { providerCount: value })}
      />
    </>
  );

  const rightFields = (
    <>
      <OrganizationInlineField
        label="Organization ID"
        value={organization.organizationCode || organizationId}
        editable={false}
        displayValue={
          <span className="font-mono text-xs">
            {organization.organizationCode || organizationId}
          </span>
        }
      />
      <OrganizationInlineField
        label="Parent Organization"
        value={parent?.name || ""}
        editable={false}
        displayValue={
          parentId && parent?.name ? (
            <LinkCell href={`/organizations/${parentId}`}>
              {parent.name}
            </LinkCell>
          ) : undefined
        }
      />
      <OrganizationInlineField
        label="Website"
        value={organization.website || ""}
        editable={canEdit}
        type="url"
        isSaving={savingField === "website"}
        onSave={(value) => saveField("website", { website: value })}
        displayValue={
          organization.website ? (
            <a
              href={
                organization.website.startsWith("http")
                  ? organization.website
                  : `https://${organization.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {organization.website}
            </a>
          ) : undefined
        }
      />
      <OrganizationInlineField
        label="Address"
        value={organization.address || ""}
        editable={canEdit}
        type="textarea"
        isSaving={savingField === "address"}
        onSave={(value) => saveField("address", { address: value })}
      />
      <OrganizationInlineField
        label="Description"
        value={organization.description || ""}
        editable={canEdit}
        type="textarea"
        isSaving={savingField === "description"}
        onSave={(value) => saveField("description", { description: value })}
      />
      <OrganizationInlineField
        label="Subscription Plan"
        value={organization.subscriptionPlan || "free"}
        editable={false}
        displayValue={
          <Badge variant="secondary" className="capitalize">
            {organization.subscriptionPlan || "free"}
          </Badge>
        }
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
        value={formatDateTime(organization.createdAt)}
        editable={false}
      />
      <OrganizationInlineField
        label="Last Updated"
        value={formatDateTime(organization.updatedAt)}
        editable={false}
      />
    </>
  );

  return (
    <div className="glass rounded-3xl p-4 sm:p-6">
      <h2 className="mb-1 text-base font-semibold text-foreground">
        Organization Information
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
