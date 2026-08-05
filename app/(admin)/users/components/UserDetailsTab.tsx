"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OrganizationInlineField } from "@/app/(admin)/organizations/components/OrganizationInlineField";
import { LinkCell } from "@/components/shared/LinkCell";
import { Badge } from "@/components/ui/badge";
import { roleService } from "@/services/role.service";
import { roleKeys } from "@/services/role.queries";
import type { UpdateUserData, User } from "@/types/user.types";

const formatDateTime = (value?: string | Date) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
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

  const org =
    typeof user.organizationId === "object" ? user.organizationId : null;
  const orgId = org?.id || org?._id || "";
  const role = typeof user.roleId === "object" ? user.roleId : null;
  const roleId =
    (typeof user.roleId === "object"
      ? user.roleId?._id || user.roleId?.id
      : user.roleId) || "";
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const isActive = user.isActive !== false;

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
    enabled: Boolean(orgId) && canEdit,
    staleTime: 5 * 60 * 1000,
  });

  const roleOptions = (rolesQuery.data?.roles || []).map((item) => ({
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

  return (
    <div className="space-y-4">
      <Section title="User Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div>
            <OrganizationInlineField
              label="User ID"
              value={user.userCode || userId}
              editable={false}
              displayValue={
                <span className="font-mono text-xs">
                  {user.userCode || userId}
                </span>
              }
            />
            <OrganizationInlineField
              label="Full Name"
              value={fullName}
              editable={canEdit}
              isSaving={savingField === "fullName"}
              onSave={(value) => {
                const { firstName, lastName } = splitFullName(value);
                return saveField("fullName", { firstName, lastName });
              }}
            />
            <OrganizationInlineField
              label="Display Name"
              value={fullName}
              editable={false}
            />
            <OrganizationInlineField
              label="Email"
              value={user.email || ""}
              type="email"
              editable={canEdit}
              isSaving={savingField === "email"}
              onSave={(value) => saveField("email", { email: value })}
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
          <div>
            <OrganizationInlineField
              label="Phone Number"
              value=""
              editable={false}
            />
            <OrganizationInlineField
              label="Username"
              value={user.email || ""}
              editable={false}
            />
            <OrganizationInlineField
              label="Status"
              value={isActive ? "active" : "inactive"}
              editable={canEdit}
              type="select"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              isSaving={savingField === "isActive"}
              onSave={(value) =>
                saveField("isActive", { isActive: value === "active" })
              }
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
              label="Email Verified"
              value={user.isEmailVerified ? "Yes" : "No"}
              editable={false}
            />
          </div>
        </div>
      </Section>

      <Section title="Organization Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div>
            <OrganizationInlineField
              label="Organization"
              value={org?.name || user.organizationName || ""}
              editable={false}
              displayValue={
                orgId && (org?.name || user.organizationName) ? (
                  <LinkCell href={`/organizations/${orgId}`}>
                    {org?.name || user.organizationName}
                  </LinkCell>
                ) : undefined
              }
            />
            <OrganizationInlineField
              label="Department"
              value=""
              editable={false}
            />
          </div>
          <div>
            <OrganizationInlineField
              label="Designation"
              value={
                Array.isArray(user.qualifications) && user.qualifications.length
                  ? user.qualifications.join(", ")
                  : ""
              }
              editable={canEdit}
              isSaving={savingField === "qualifications"}
              onSave={(value) =>
                saveField("qualifications", {
                  qualifications: value
                    ? value.split(",").map((part) => part.trim()).filter(Boolean)
                    : [],
                })
              }
            />
            <OrganizationInlineField
              label="Employee ID"
              value={user.userCode || ""}
              editable={false}
            />
          </div>
        </div>
      </Section>

      <Section title="Access Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div>
            <OrganizationInlineField
              label="Primary Role"
              value={String(roleId || "")}
              editable={canEdit && roleOptions.length > 0}
              type="select"
              options={roleOptions}
              isSaving={savingField === "roleId"}
              onSave={(value) => saveField("roleId", { roleId: value })}
              displayValue={
                roleId && role?.name ? (
                  <LinkCell href={`/roles/${roleId}`}>{role.name}</LinkCell>
                ) : (
                  role?.name || undefined
                )
              }
            />
            <OrganizationInlineField
              label="Login Enabled"
              value={isActive ? "Yes" : "No"}
              editable={false}
            />
          </div>
          <div>
            <OrganizationInlineField
              label="Last Login"
              value={formatDateTime(user.lastLogin)}
              editable={false}
            />
            <OrganizationInlineField
              label="Created By"
              value=""
              editable={false}
            />
          </div>
        </div>
      </Section>

      <Section title="Audit Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div>
            <OrganizationInlineField
              label="Created At"
              value={formatDateTime(user.createdAt)}
              editable={false}
            />
            <OrganizationInlineField
              label="Updated At"
              value={formatDateTime(user.updatedAt)}
              editable={false}
            />
          </div>
          <div>
            <OrganizationInlineField
              label="Last Updated By"
              value=""
              editable={false}
            />
          </div>
        </div>
      </Section>
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
    <section className="glass rounded-3xl p-4 sm:p-6">
      <h2 className="mb-3 text-base font-semibold text-foreground">{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}
