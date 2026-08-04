"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Light / dark glass — headers, search bars, dialogs, secondary actions */
export const healthcareGlass = {
  bar: "glass rounded-2xl",
  button:
    "glass rounded-2xl hover:bg-muted/80 transition-colors",
  dialog: "glass-strong rounded-3xl",
  header: "glass rounded-3xl px-6 py-5",
};

/** Surfaces — clinical data with glass readability */
export const healthcareSolid = {
  card: "glass rounded-2xl",
  formCard: "glass-strong rounded-2xl",
  section: "glass rounded-2xl p-5",
  statCard: "glass rounded-2xl",
};

export const healthcareSearchInput =
  "rounded-2xl border-border/60 bg-input/80 backdrop-blur-md pl-9 shadow-sm focus-visible:ring-ring/30";

export const healthcarePrimaryButton =
  "rounded-full bg-primary text-primary-foreground shadow-glow hover:bg-primary/90";

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
