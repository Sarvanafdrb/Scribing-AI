"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", segment: "" },
  { label: "Recording", segment: "recording" },
  { label: "Transcript", segment: "transcript" },
  { label: "AI Notes", segment: "notes" },
] as const;

interface SessionDetailTabsProps {
  sessionId: string;
}

export function SessionDetailTabs({ sessionId }: SessionDetailTabsProps) {
  const pathname = usePathname();
  const basePath = `/sessions/${sessionId}`;

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-slate-200"
      aria-label="Session sections"
    >
      {tabs.map((tab) => {
        const href = tab.segment ? `${basePath}/${tab.segment}` : basePath;
        const isActive = tab.segment
          ? pathname === href || pathname.startsWith(`${href}/`)
          : pathname === basePath;

        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-muted-foreground hover:border-slate-300 hover:text-slate-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
