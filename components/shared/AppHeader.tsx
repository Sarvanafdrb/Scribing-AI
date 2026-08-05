"use client";

import { useEffect, useRef, useState } from "react";
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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // When the sentinel leaves the viewport, the sticky header is overlapping content.
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "0px",
      },
    );

    observer.observe(sentinel);

    const onScroll = () => {
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      if (y > 10) setIsScrolled(true);
    };

    // Immediate check + scroll fallback (covers edge cases IO misses).
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  return (
    <>
      {/* Scroll sentinel — sits above the sticky header */}
      <div
        ref={sentinelRef}
        aria-hidden
        className="pointer-events-none h-px w-full shrink-0"
      />
      <header
        data-slot="app-header"
        data-scrolled={isScrolled ? "true" : "false"}
        className={cn(
          "sticky top-0 z-[100] isolate transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300 ease-out",
          isScrolled
            ? "border-b border-white/25 bg-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.14)] backdrop-blur-3xl backdrop-saturate-200 dark:border-white/20 dark:bg-[rgba(16,18,26,0.82)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
            : "border-b border-transparent bg-transparent shadow-none backdrop-blur-[2px]",
          className,
        )}
      >
        <div className="relative z-[1] flex min-h-16 items-center justify-between gap-4 px-4 py-3 lg:px-6">
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
    </>
  );
}
