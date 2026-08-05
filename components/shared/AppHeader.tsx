"use client";

import { WorkspaceSwitcher } from "@/components/shared/WorkspaceSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function AppHeader({
  title = "Scribble AI",
  subtitle,
  className,
  children,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 glass border-b border-border/50",
        className,
      )}
    >
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <WorkspaceSwitcher />
          <div className="hidden min-w-0 border-l border-border/60 pl-4 md:block">
            <p className="truncate text-sm font-semibold text-foreground">
              {title}
            </p>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {children}
        </div>
      </div>
    </header>
  );
}
