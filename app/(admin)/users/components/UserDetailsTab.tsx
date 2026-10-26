"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { OrganizationInlineField } from "@/app/(admin)/organizations/components/OrganizationInlineField";
import { LinkCell } from "@/components/shared/LinkCell";
import { Badge } from "@/components/ui/badge";
import { roleService } from "@/services/role.service";
import { roleKeys } from "@/services/role.queries";
import type { UpdateUserData, User } from "@/types/user.types";
import { getUserDepartmentName, isDoctorRoleName } from "@/types/user.types";
import { AuditInformation } from "@/components/shared/AuditInformation";
import {
  INDIAN_MOBILE_LENGTH,
  INDIAN_PHONE_ERROR,
  isValidIndianPhoneNumber,
  normalizeIndianPhoneNumber,
  sanitizeIndianPhoneInput,
} from "@/utils/patient.utils";

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
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

const parseBoolYesNo = (value: string) => value === "yes" || value === "true";

interface UserDetailsTabProps {
  user: User;
  userId: string;
  canEdit: boolean;
  onUpdateField: (data: UpdateUserData) => Promise<void>;
}

export function UserDetailsTab({
  user,
  userId,
  canEdit,
  onUpdateField,
}: UserDetailsTabProps) {
  const [savingField, setSavingField] = useState<string | null>(null);
  const anyUser = user as any;

  const org =
    typeof user.organizationId === "object" ? user.organizationId : null;
  const orgId = org?.id || org?._id || "";

  const role = typeof user.roleId === "object" ? (user.roleId as any) : null;
  const roleId = (role?._id || role?.id || user.roleId || "") as string;

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const isActive = user.isActive !== false;

  const phoneNumber =
    typeof user.phone === "string" && user.phone.trim()
      ? user.phone
      : typeof anyUser.phoneNumber === "string" && anyUser.phoneNumber.trim()
        ? anyUser.phoneNumber
        : "";

  const username =
    typeof anyUser.username === "string" ? anyUser.username : user.email;

  const employeeId =
    typeof anyUser.employeeId === "string"
      ? anyUser.employeeId
      : typeof anyUser.employeeID === "string"
        ? anyUser.employeeID
        : "—";

  const qualifications: string[] = Array.isArray(anyUser.qualifications)
    ? anyUser.qualifications
    : [];

  const inferredDepartment = getUserDepartmentName(user) || "—";
  const designation =
    typeof user.designation === "string" && user.designation.trim()
      ? user.designation.trim()
      : typeof anyUser.designation === "string" && anyUser.designation.trim()
        ? anyUser.designation.trim()
        : "";
  const isDoctor = isDoctorRoleName(role?.name);
  const specialization =
    typeof anyUser.specialization === "string" ? anyUser.specialization : "";

  const rolesQuery = useQuery({
    queryKey: roleKeys.list({
      organizationId: orgId,
      search: "",
      page: 1,
      limit: 100,
    }),
    queryFn: () =>
      roleService.getList({
        organizationId: orgId || undefined,
        page: 1,
        limit: 100,
      }),
    enabled: Boolean(orgId),
    staleTime: 5 * 60 * 1000,
  });

  const roleOptions = (rolesQuery.data?.roles || []).map((item: any) => ({
    value: String(item.id || item._id || ""),
    label: item.name,
  }));

  const saveField = async (fieldKey: string, payload: UpdateUserData) => {
    setSavingField(fieldKey);
    try {
      await onUpdateField(payload);
    } finally {
      setSavingField(null);
    }
  };

  const onSaveNoopWithToast = async (label: string, value: string) => {
    toast.info(`${label} is not editable on this record page.`);
    return;
  };

  const onSaveFullName = async (value: string) => {
    if (!canEdit) {
      toast.info("You don't have permission to edit this user.");
      return;
    }
    const next = splitFullName(value);
    if (!next.firstName || !next.lastName) {
      toast.error("Please enter both first name and last name.");
      return;
    }
    await saveField("fullName", {
      firstName: next.firstName,
      lastName: next.lastName,
    });
  };

  const statusValue = isActive ? "active" : "inactive";

  return (
    <div className="space-y-4">
      <Section title="User Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="User ID"
              value={user.userCode || userId}
              editable={false}
              type="text"
              isSaving={savingField === "userCode"}
              onSave={(value) => onSaveNoopWithToast("User ID", value)}
              displayValue={
                <span className="font-mono text-xs">
                  {user.userCode || userId}
                </span>
              }
            />
            <OrganizationInlineField
              label="Full Name"
              value={fullName}
              editable={true}
              type="text"
              isSaving={savingField === "fullName"}
              onSave={onSaveFullName}
            />
            <OrganizationInlineField
              label="Email"
              value={user.email || ""}
              type="email"
              editable={true}
              isSaving={savingField === "email"}
              onSave={async (value) => {
                if (!canEdit) {
                  toast.info("You don't have permission to edit this user.");
                  return;
                }
                await saveField("email", { email: value });
              }}
              displayValue={
                user.email ? (
                  <a
                    href={`mailto:${user.email}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {user.email}
                  </a>
                ) : undefined
              }
            />
          </div>

          <div className="space-y-0">
            <OrganizationInlineField
              label="Phone Number"
              value={phoneNumber}
              editable={canEdit}
              isSaving={savingField === "phone"}
              maxLength={INDIAN_MOBILE_LENGTH}
              inputMode="numeric"
              sanitizeDraft={sanitizeIndianPhoneInput}
              onSave={async (value) => {
                if (!canEdit) {
                  toast.info("You don't have permission to edit this user.");
                  return;
                }
                const trimmed = value.trim();
                if (!trimmed) {
                  await saveField("phone", { phone: "" });
                  return;
                }
                const phone = normalizeIndianPhoneNumber(trimmed);
                if (!isValidIndianPhoneNumber(phone)) {
                  toast.error(INDIAN_PHONE_ERROR);
                  return;
                }
                await saveField("phone", { phone });
              }}
              displayValue={phoneNumber || undefined}
            />
            <OrganizationInlineField
              label="Username"
              value={username || ""}
              editable={false}
              isSaving={savingField === "username"}
              onSave={(value) => onSaveNoopWithToast("Username", value)}
              displayValue={username || undefined}
            />
            <OrganizationInlineField
              label="Email Verified"
              value={user.isEmailVerified ? "yes" : "no"}
              editable={false}
              type="select"
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              isSaving={savingField === "isEmailVerified"}
              onSave={async (value) => {
                if (!canEdit) {
                  toast.info("You don't have permission to edit this user.");
                  return;
                }
                await saveField("isEmailVerified", {
                  isEmailVerified: parseBoolYesNo(value),
                });
              }}
              displayValue={<span>{user.isEmailVerified ? "Yes" : "No"}</span>}
            />
          </div>
        </div>
      </Section>

      <Section title="Organization Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Organization"
              value={org?.name || (user as any).organizationName || ""}
              editable={false}
              isSaving={savingField === "organization"}
              onSave={(value) => onSaveNoopWithToast("Organization", value)}
              displayValue={
                orgId ? (
                  <LinkCell href={`/organizations/${orgId}`}>
                    {org?.name || (user as any).organizationName}
                  </LinkCell>
                ) : undefined
              }
            />
            <OrganizationInlineField
              label="Department"
              value={inferredDepartment === "—" ? "" : inferredDepartment}
              editable={false}
              isSaving={savingField === "department"}
              onSave={(value) => onSaveNoopWithToast("Department", value)}
              displayValue={
                inferredDepartment !== "—" ? inferredDepartment : undefined
              }
            />
            {isDoctor ? (
              <OrganizationInlineField
                label="Specialization"
                value={specialization}
                editable={canEdit}
                isSaving={savingField === "specialization"}
                onSave={async (value) => {
                  if (!canEdit) {
                    toast.info("You don't have permission to edit this user.");
                    return;
                  }
                  await saveField("specialization", {
                    specialization: value.trim() || undefined,
                  });
                }}
                displayValue={specialization || undefined}
              />
            ) : null}
            {isDoctor ? (
              <OrganizationInlineField
                label="Qualification"
                value={qualifications.join(", ")}
                editable={canEdit}
                isSaving={savingField === "qualifications"}
                onSave={async (value) => {
                  if (!canEdit) {
                    toast.info("You don't have permission to edit this user.");
                    return;
                  }
                  await saveField("qualifications", {
                    qualifications: value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  });
                }}
                displayValue={
                  qualifications.length > 0
                    ? qualifications.join(", ")
                    : undefined
                }
              />
            ) : null}
          </div>

          <div className="space-y-0">
            <OrganizationInlineField
              label="Designation"
              value={designation}
              editable={canEdit}
              isSaving={savingField === "designation"}
              onSave={async (value) => {
                if (!canEdit) {
                  toast.info("You don't have permission to edit this user.");
                  return;
                }
                await saveField("designation", {
                  designation: value.trim() || undefined,
                });
              }}
              displayValue={designation || undefined}
            />
            <OrganizationInlineField
              label="Employee ID"
              value={employeeId === "—" ? "" : employeeId}
              editable={false}
              isSaving={savingField === "employeeId"}
              onSave={(value) => onSaveNoopWithToast("Employee ID", value)}
              displayValue={employeeId !== "—" ? employeeId : undefined}
            />
          </div>
        </div>
      </Section>

      <Section title="Access Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Primary Role"
              value={String(roleId || "")}
              editable={true}
              type="select"
              options={roleOptions}
              isSaving={savingField === "roleId"}
              onSave={async (value) => {
                if (!canEdit) {
                  toast.info("You don't have permission to edit this user.");
                  return;
                }
                await saveField("roleId", { roleId: value });
              }}
              displayValue={
                role?.name ? (
                  <LinkCell href={`/roles/${roleId}`}>{role.name}</LinkCell>
                ) : undefined
              }
            />
            <OrganizationInlineField
              label="Account Status"
              value={statusValue}
              editable={true}
              type="select"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              isSaving={savingField === "accountStatus"}
              onSave={async (value) => {
                if (!canEdit) {
                  toast.info("You don't have permission to edit this user.");
                  return;
                }
                await saveField("accountStatus", {
                  isActive: value === "active",
                });
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
            <OrganizationInlineField
              label="Login Enabled"
              value={isActive ? "yes" : "no"}
              editable={false}
              type="select"
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              isSaving={savingField === "loginEnabled"}
              onSave={async (value) => {
                if (!canEdit) {
                  toast.info("You don't have permission to edit this user.");
                  return;
                }
                await saveField("loginEnabled", {
                  isActive: parseBoolYesNo(value),
                });
              }}
              displayValue={<span>{isActive ? "Yes" : "No"}</span>}
            />
          </div>

          <div className="space-y-0">
            <OrganizationInlineField
              label="Last Login"
              value={user.lastLogin ? formatDateTime(user.lastLogin) : "—"}
              editable={false}
              isSaving={savingField === "lastLogin"}
              onSave={(value) => onSaveNoopWithToast("Last Login", value)}
              displayValue={
                user.lastLogin ? formatDateTime(user.lastLogin) : undefined
              }
            />
          </div>
        </div>
      </Section>

      <AuditInformation
        createdBy={user.createdBy}
        createdAt={user.createdAt}
        updatedBy={user.updatedBy}
        updatedAt={user.updatedAt}
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl border border-border/60 p-4 sm:p-6">
      <h2 className="mb-3 text-base font-semibold text-foreground">{title}</h2>
      <dl className="space-y-0">{children}</dl>
    </section>
  );
}
