"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Details", segment: "" },
  { label: "Related", segment: "related" },
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
    <div className="border-b border-border/60">
      <nav className="flex flex-wrap gap-1" aria-label="Consultation sections">
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
                "-mb-px border-b px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
