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
}

export function DoctorNav({ className, onNavigate }: DoctorNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-wrap gap-1", className)}>
      {NAV_ITEMS.map((item) => {
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
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export { NAV_ITEMS as DOCTOR_NAV_ITEMS };
