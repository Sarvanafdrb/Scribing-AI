"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Light glass — headers, search bars, dialogs, secondary actions */
export const healthcareGlass = {
  bar: "rounded-xl border border-white/70 bg-white/65 backdrop-blur-md shadow-sm",
  button:
    "rounded-xl border border-slate-200/80 bg-white/75 backdrop-blur-sm shadow-sm hover:bg-white/90",
  dialog: "rounded-2xl border border-white/60 bg-white/85 backdrop-blur-xl",
  header:
    "rounded-2xl border border-white/50 bg-white/60 backdrop-blur-md px-6 py-5 shadow-sm",
};

/** Solid surfaces — forms and clinical data for readability */
export const healthcareSolid = {
  card: "rounded-xl border border-slate-200 bg-white shadow-sm",
  formCard: "rounded-xl border border-slate-200 bg-white shadow-sm",
  section: "rounded-xl border border-slate-100 bg-white p-5 shadow-sm",
  statCard: "rounded-xl border border-slate-200 bg-white shadow-sm",
};

export const healthcareSearchInput =
  "rounded-xl border border-slate-200/80 bg-white/75 backdrop-blur-sm pl-9 shadow-sm focus-visible:ring-blue-500/25";

export const healthcarePrimaryButton =
  "rounded-xl bg-blue-600 shadow-sm hover:bg-blue-700";

export function HealthcarePageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        healthcareGlass.header,
        className,
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
