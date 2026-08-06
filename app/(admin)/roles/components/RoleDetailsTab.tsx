"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { OrganizationInlineField } from "@/app/(admin)/organizations/components/OrganizationInlineField";
import { LinkCell } from "@/components/shared/LinkCell";
import { Badge } from "@/components/ui/badge";
import { organizationService } from "@/services/organization.service";
import { organizationKeys } from "@/services/organization.queries";
import type { Role, UpdateRoleData } from "@/types/role.types";

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
};

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

interface RoleDetailsTabProps {
  role: Role;
  roleId: string;
  canEdit: boolean;
  onUpdateField: (data: UpdateRoleData) => Promise<void>;
}

export function RoleDetailsTab({
  role,
  roleId,
  canEdit,
  onUpdateField,
}: RoleDetailsTabProps) {
  const [savingField, setSavingField] = useState<string | null>(null);
  const isActive = role.isActive !== false;
  const statusValue = isActive ? "active" : "inactive";
  const organizationId =
    typeof role.organizationId === "string" ? role.organizationId : "";

  const orgQuery = useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: () => organizationService.getById(organizationId),
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });

  const orgName = orgQuery.data?.name || "—";
  const orgCode = orgQuery.data?.organizationCode || "—";

  const saveField = async (fieldKey: string, payload: UpdateRoleData) => {
    if (!canEdit) {
      toast.info("You don't have permission to edit this role.");
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
      <Section title="Role Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Role ID"
              value={roleId}
              editable={false}
              displayValue={<span className="font-mono text-xs">{roleId}</span>}
            />
            <OrganizationInlineField
              label="Role Name"
              value={role.name || ""}
              editable={canEdit}
              type="text"
              isSaving={savingField === "name"}
              onSave={async (value) => {
                if (!value.trim()) {
                  toast.error("Role name is required.");
                  return;
                }
                await saveField("name", { name: value.trim() });
              }}
            />
            <OrganizationInlineField
              label="Description"
              value={role.description || ""}
              editable={canEdit}
              type="textarea"
              isSaving={savingField === "description"}
              onSave={async (value) => {
                await saveField("description", {
                  description: value.trim() || undefined,
                });
              }}
              displayValue={role.description || "—"}
            />
          </div>

          <div className="space-y-0">
            <OrganizationInlineField
              label="Status"
              value={statusValue}
              editable={canEdit}
              type="select"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              isSaving={savingField === "status"}
              onSave={async (value) => {
                await saveField("status", { isActive: value === "active" });
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
              label="Organization"
              value={orgName}
              editable={false}
              displayValue={
                organizationId ? (
                  <LinkCell href={`/organizations/${organizationId}`}>
                    {orgQuery.isLoading ? "Loading…" : orgName}
                  </LinkCell>
                ) : (
                  "—"
                )
              }
            />
            <OrganizationInlineField
              label="Organization Code"
              value={orgCode}
              editable={false}
              displayValue={
                <span className="font-mono text-xs">
                  {orgQuery.isLoading ? "…" : orgCode}
                </span>
              }
            />
          </div>
        </div>
      </Section>

      <Section title="System Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Created"
              value={formatDateTime(role.createdAt)}
              editable={false}
            />
          </div>
          <div className="space-y-0">
            <OrganizationInlineField
              label="Last Updated"
              value={formatDateTime(role.updatedAt)}
              editable={false}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
