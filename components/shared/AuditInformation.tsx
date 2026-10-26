"use client";

import type { AuditActor, AuditMetadata } from "@/types/audit.types";

export function formatAuditDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

export function formatAuditActor(actor?: AuditActor | string | null): string {
  if (!actor) return "—";
  if (typeof actor === "string") {
    const trimmed = actor.trim();
    return trimmed || "—";
  }
  return actor.name?.trim() || "—";
}

type AuditInformationProps = AuditMetadata & {
  className?: string;
  title?: string;
};

function AuditField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function AuditInformation({
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
  className,
  title = "Audit Information",
}: AuditInformationProps) {
  return (
    <section
      className={
        className ??
        "glass rounded-2xl border border-border/60 p-4 sm:p-6"
      }
    >
      <h2 className="mb-3 text-base font-semibold text-foreground">{title}</h2>
      <dl className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
        <div className="space-y-0">
          <AuditField
            label="Created By"
            value={formatAuditActor(createdBy)}
          />
          <AuditField
            label="Created At"
            value={formatAuditDateTime(createdAt)}
          />
        </div>
        <div className="space-y-0">
          <AuditField
            label="Updated By"
            value={formatAuditActor(updatedBy)}
          />
          <AuditField
            label="Updated At"
            value={formatAuditDateTime(updatedAt)}
          />
        </div>
      </dl>
    </section>
  );
}
