"use client";

import { useState } from "react";
import { toast } from "sonner";
import { OrganizationInlineField } from "@/app/(admin)/organizations/components/OrganizationInlineField";
import { LinkCell } from "@/components/shared/LinkCell";
import { Badge } from "@/components/ui/badge";
import {
  BLOOD_GROUPS,
  type Patient,
  type UpdatePatientData,
} from "@/types/patient.types";
import {
  getPatientAge,
  getPatientFullName,
  isValidIndianPhoneNumber,
  normalizeIndianPhoneNumber,
  INDIAN_PHONE_ERROR,
} from "@/utils/patient.utils";

const formatDate = (value?: string) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "—";
  }
};

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
};

const toDateInputValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

const listToCsv = (items?: string[]) =>
  (items || []).map((item) => item.trim()).filter(Boolean).join(", ");

const csvToList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="glass rounded-2xl border border-border/60 p-4 sm:p-6">
    <h3 className="mb-3 text-base font-semibold text-foreground">{title}</h3>
    {children}
  </section>
);

interface PatientDetailsTabProps {
  patient: Patient;
  patientId: string;
  canEdit: boolean;
  canManageStatus?: boolean;
  onUpdateField: (data: UpdatePatientData) => Promise<void>;
}

export function PatientDetailsTab({
  patient,
  patientId,
  canEdit,
  canManageStatus = false,
  onUpdateField,
}: PatientDetailsTabProps) {
  const [savingField, setSavingField] = useState<string | null>(null);

  const org =
    typeof patient.organizationId === "object" ? patient.organizationId : null;
  const orgId = org?.id || org?._id || "";
  const orgName = org?.name || "—";
  const fullName = getPatientFullName(patient);
  const age = getPatientAge(patient);
  const isActive = patient.isActive !== false;
  const statusValue = isActive ? "active" : "inactive";

  const saveField = async (fieldKey: string, payload: UpdatePatientData) => {
    if (!canEdit) {
      toast.info("You don't have permission to edit this patient.");
      return;
    }
    setSavingField(fieldKey);
    try {
      await onUpdateField(payload);
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Patient Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Patient Code"
              value={patient.patientCode || patientId}
              editable={false}
              displayValue={
                <span className="font-mono text-xs">
                  {patient.patientCode || patientId}
                </span>
              }
            />
            <OrganizationInlineField
              label="Full Name"
              value={fullName === "—" ? "" : fullName}
              editable={canEdit}
              type="text"
              isSaving={savingField === "fullName"}
              onSave={async (value) => {
                const next = splitFullName(value);
                if (!next.firstName || !next.lastName) {
                  toast.error("Please enter both first name and last name.");
                  return;
                }
                await saveField("fullName", {
                  firstName: next.firstName,
                  lastName: next.lastName,
                });
              }}
            />
            <OrganizationInlineField
              label="Gender"
              value={patient.gender || "unknown"}
              editable={canEdit}
              type="select"
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
                { value: "unknown", label: "Unknown" },
              ]}
              isSaving={savingField === "gender"}
              onSave={async (value) => {
                await saveField("gender", {
                  gender: value as Patient["gender"],
                });
              }}
              displayValue={
                patient.gender
                  ? patient.gender.charAt(0).toUpperCase() +
                    patient.gender.slice(1)
                  : "—"
              }
            />
            <OrganizationInlineField
              label="Blood Group"
              value={patient.bloodGroup || "none"}
              editable={canEdit}
              type="select"
              options={[
                { value: "none", label: "—" },
                ...BLOOD_GROUPS.map((group) => ({
                  value: group,
                  label: group,
                })),
              ]}
              isSaving={savingField === "bloodGroup"}
              onSave={async (value) => {
                await saveField("bloodGroup", {
                  bloodGroup:
                    value === "none"
                      ? ""
                      : (value as UpdatePatientData["bloodGroup"]),
                });
              }}
              displayValue={patient.bloodGroup || "—"}
            />
          </div>

          <div className="space-y-0">
            <OrganizationInlineField
              label="Date of Birth"
              value={toDateInputValue(patient.dateOfBirth)}
              editable={canEdit}
              type="text"
              isSaving={savingField === "dateOfBirth"}
              onSave={async (value) => {
                if (!value.trim()) {
                  await saveField("dateOfBirth", { dateOfBirth: undefined });
                  return;
                }
                const parsed = new Date(value);
                if (Number.isNaN(parsed.getTime())) {
                  toast.error("Enter date as YYYY-MM-DD.");
                  return;
                }
                await saveField("dateOfBirth", {
                  dateOfBirth: parsed.toISOString(),
                });
              }}
              displayValue={formatDate(patient.dateOfBirth)}
            />
            <OrganizationInlineField
              label="Age"
              value={age !== null ? String(age) : ""}
              editable={canEdit && !patient.dateOfBirth}
              type="text"
              isSaving={savingField === "age"}
              onSave={async (value) => {
                const digits = value.replace(/\D/g, "");
                if (!digits) {
                  await saveField("age", { age: undefined });
                  return;
                }
                const nextAge = Number(digits);
                if (!Number.isFinite(nextAge) || nextAge < 0 || nextAge > 150) {
                  toast.error("Enter a valid age.");
                  return;
                }
                await saveField("age", { age: nextAge });
              }}
              displayValue={
                age !== null
                  ? `${age} years${patient.dateOfBirth ? " (from DOB)" : ""}`
                  : "—"
              }
            />
            <OrganizationInlineField
              label="Status"
              value={statusValue}
              editable={canManageStatus}
              type="select"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              isSaving={savingField === "status"}
              onSave={async (value) => {
                if (!canManageStatus) {
                  toast.info("You don't have permission to change patient status.");
                  return;
                }
                setSavingField("status");
                try {
                  await onUpdateField({ isActive: value === "active" });
                } finally {
                  setSavingField(null);
                }
              }}
              displayValue={
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={isActive ? "bg-primary" : undefined}
                >
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              }
            />
          </div>
        </div>
      </Section>

      <Section title="Contact Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Phone Number"
              value={patient.phoneNumber || ""}
              editable={canEdit}
              type="text"
              isSaving={savingField === "phoneNumber"}
              onSave={async (value) => {
                const phone = normalizeIndianPhoneNumber(value);
                if (!isValidIndianPhoneNumber(phone)) {
                  toast.error(INDIAN_PHONE_ERROR);
                  return;
                }
                await saveField("phoneNumber", { phoneNumber: phone });
              }}
            />
            <OrganizationInlineField
              label="Email"
              value={patient.email || ""}
              editable={canEdit}
              type="email"
              isSaving={savingField === "email"}
              onSave={async (value) => {
                await saveField("email", { email: value || undefined });
              }}
              displayValue={
                patient.email ? (
                  <a
                    href={`mailto:${patient.email}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {patient.email}
                  </a>
                ) : undefined
              }
            />
          </div>
          <div className="space-y-0">
            <OrganizationInlineField
              label="Address"
              value={patient.address || ""}
              editable={canEdit}
              type="textarea"
              isSaving={savingField === "address"}
              onSave={async (value) => {
                await saveField("address", { address: value || undefined });
              }}
            />
          </div>
        </div>
      </Section>

      <Section title="Clinical Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Allergies"
              value={listToCsv(patient.allergies)}
              editable={canEdit}
              type="textarea"
              isSaving={savingField === "allergies"}
              onSave={async (value) => {
                await saveField("allergies", { allergies: csvToList(value) });
              }}
              displayValue={
                patient.allergies?.length
                  ? patient.allergies.join(", ")
                  : "—"
              }
            />
          </div>
          <div className="space-y-0">
            <OrganizationInlineField
              label="Medications"
              value={listToCsv(patient.medications)}
              editable={canEdit}
              type="textarea"
              isSaving={savingField === "medications"}
              onSave={async (value) => {
                await saveField("medications", {
                  medications: csvToList(value),
                });
              }}
              displayValue={
                patient.medications?.length
                  ? patient.medications.join(", ")
                  : "—"
              }
            />
          </div>
        </div>
      </Section>

      <Section title="Organization & Record">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Organization"
              value={orgName}
              editable={false}
              displayValue={
                orgId ? (
                  <LinkCell href={`/organizations/${orgId}`}>{orgName}</LinkCell>
                ) : (
                  orgName
                )
              }
            />
            <OrganizationInlineField
              label="Organization Code"
              value={org?.organizationCode || ""}
              editable={false}
              displayValue={
                <span className="font-mono text-xs">
                  {org?.organizationCode || "—"}
                </span>
              }
            />
          </div>
          <div className="space-y-0">
            <OrganizationInlineField
              label="Created"
              value={formatDateTime(patient.createdAt)}
              editable={false}
            />
            <OrganizationInlineField
              label="Last Updated"
              value={formatDateTime(patient.updatedAt)}
              editable={false}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
