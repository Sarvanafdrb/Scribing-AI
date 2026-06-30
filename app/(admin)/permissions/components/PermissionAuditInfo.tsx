"use client";

function formatAuditDateTime(value?: string | Date | null): string {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";

  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  const dayPeriod = get("dayPeriod").toUpperCase();

  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`;
}

interface PermissionAuditInfoProps {
  roleName: string;
  updatedBy?: string | null;
  updatedAt?: string | Date | null;
}

export function PermissionAuditInfo({
  roleName,
  updatedBy,
  updatedAt,
}: PermissionAuditInfoProps) {
  return (
    <div className="border-b bg-white px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Audit Information
      </h3>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">
            Role Name
          </dt>
          <dd className="mt-0.5 font-medium capitalize text-slate-900">
            {roleName}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">
            Last Updated By
          </dt>
          <dd className="mt-0.5 text-slate-800">{updatedBy || "-"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">
            Last Updated On
          </dt>
          <dd className="mt-0.5 text-slate-800">
            {formatAuditDateTime(updatedAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
