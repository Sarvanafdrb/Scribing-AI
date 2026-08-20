"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Scissors,
  Stethoscope,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessControl } from "@/hooks/useAccessControl";

const NAV_ITEMS = [
  {
    href: "/doctor",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (path: string) => path === "/doctor",
  },
  {
    href: "/doctor/consultations",
    label: "Today's Consultations",
    icon: Stethoscope,
    match: (path: string) =>
      path === "/doctor/consultations" || path === "/doctor/workspace",
  },
  {
    href: "/doctor/patients",
    label: "Patients",
    icon: Users,
    match: (path: string) => path.startsWith("/doctor/patients"),
  },
  {
    href: "/doctor/schedule",
    label: "Schedule",
    icon: CalendarDays,
    match: (path: string) => path === "/doctor/schedule",
  },
  {
    href: "/doctor/surgery",
    label: "Surgery",
    icon: Scissors,
    match: (path: string) => path === "/doctor/surgery",
  },
] as const;

interface DoctorNavProps {
  className?: string;
  onNavigate?: (href: string) => boolean;
  inline?: boolean;
}

export function DoctorNav({
  className,
  onNavigate,
  inline = false,
}: DoctorNavProps) {
  const pathname = usePathname();
  const { canViewPatients } = useAccessControl();

  const navItems = NAV_ITEMS.filter(
    (item) => item.href !== "/doctor/patients" || canViewPatients(),
  );

  return (
    <nav
      className={cn(
        inline
          ? "flex items-center gap-0.5 sm:gap-1"
          : "flex flex-wrap gap-1",
        className,
      )}
    >
      {navItems.map((item) => {
        const isActive = item.match(pathname);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(event) => {
              if (onNavigate && !onNavigate(item.href)) {
                event.preventDefault();
              }
            }}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium transition-colors",
              inline ? "px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm" : "px-3 py-2 text-sm",
              isActive
                ? "bg-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className={cn(inline ? "hidden md:inline" : "hidden sm:inline")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export { NAV_ITEMS as DOCTOR_NAV_ITEMS };
