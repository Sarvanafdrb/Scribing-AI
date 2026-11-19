"use client";

import { AlertTriangle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SosEmergencyHeaderProps {
  hotline?: string;
  className?: string;
}

export function SosEmergencyHeader({
  hotline = "1800-123-4567",
  className,
}: SosEmergencyHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-rose-50 to-red-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-600/30">
          <AlertTriangle className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            SOS Emergency
          </h1>
          <p className="mt-1 text-sm text-gray-700">
            Immediate help required. Alert the hospital team now.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="shrink-0 rounded-full border-red-300 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
        asChild
      >
        <a href={`tel:${hotline.replace(/\D/g, "")}`}>
          <Phone className="mr-2 h-4 w-4" />
          Emergency Hotline {hotline}
        </a>
      </Button>
    </div>
  );
}