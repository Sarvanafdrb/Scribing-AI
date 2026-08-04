"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Glass surfaces — headers, search bars, dialogs, secondary actions */
export const healthcareGlass = {
  bar: "glass rounded-2xl",
  button: "glass-pill hover:bg-white/10 transition-colors",
  dialog: "glass-strong rounded-3xl",
  header: "glass rounded-3xl px-6 py-5",
};

export const healthcareSolid = {
  card: "glass rounded-3xl",
  formCard: "glass-strong rounded-3xl",
  section: "glass rounded-3xl p-5",
  statCard: "glass rounded-3xl",
};

export const healthcareSearchInput =
  "rounded-full border-border bg-transparent pl-9 focus-visible:ring-ring/30";

export const healthcarePrimaryButton =
  "rounded-full bg-primary text-primary-foreground shadow-glow hover:opacity-90";

export const healthcareCtaButton =
  "rounded-full bg-cta text-cta-foreground shadow-cta hover:opacity-95";

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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
