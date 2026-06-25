"use client";

import { WorkspaceSwitcher } from "@/components/shared/WorkspaceSwitcher";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function AppHeader({
  title = "Scribing AI",
  subtitle,
  className,
  children,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80",
        className,
      )}
    >
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <WorkspaceSwitcher />
          <div className="hidden min-w-0 border-l border-gray-200 pl-4 md:block">
            <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
            {subtitle && (
              <p className="truncate text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </header>
  );
}
