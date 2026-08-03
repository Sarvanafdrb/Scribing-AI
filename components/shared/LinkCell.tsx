"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type LinkCellProps = {
  href: string;
  children: ReactNode;
  className?: string;
  /** Monospace styling for codes / IDs */
  mono?: boolean;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

/**
 * Primary-field hyperlink for data tables.
 * Uses Next.js Link so Ctrl/Cmd+Click opens in a new tab.
 */
export function LinkCell({
  href,
  children,
  className,
  mono = false,
  ...props
}: LinkCellProps) {
  return (
    <Link
      href={href}
      className={cn(
        "cursor-pointer text-primary transition-colors duration-150",
        "underline-offset-2 hover:underline",
        "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        mono ? "font-mono text-sm font-medium" : "font-medium",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
