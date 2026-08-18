"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { medicineService } from "@/services/medicine.service";
import { medicineKeys } from "@/services/medicine.queries";
import type { MedicineSearchResult } from "@/types/medicine.types";
import { formatMedicineCost } from "@/components/shared/medicine/medicineForm.utils";
import { cn } from "@/lib/utils";

interface MedicationConditionSearchProps {
  organizationId?: string;
  excludedMedicineIds?: string[];
  onAdd: (medicine: MedicineSearchResult) => void;
  className?: string;
}

export function MedicationConditionSearch({
  organizationId,
  excludedMedicineIds = [],
  onAdd,
  className,
}: MedicationConditionSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const trimmed = query.trim();

  const searchQuery = useQuery({
    queryKey: medicineKeys.search(trimmed, organizationId),
    queryFn: () => medicineService.search(trimmed, organizationId),
    enabled: open && trimmed.length >= 1,
    staleTime: 15 * 1000,
  });

  const results = useMemo(() => {
    const excluded = new Set(excludedMedicineIds.filter(Boolean));
    return (searchQuery.data || []).filter(
      (medicine) => !excluded.has(medicine.id),
    );
  }, [excludedMedicineIds, searchQuery.data]);

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Allow click on results before closing.
            window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder="Search condition or symptom..."
          className="rounded-xl border-teal-100 pl-9 text-sm"
        />
      </div>

      {open && trimmed.length >= 1 ? (
        <div className="absolute right-0 z-30 mt-1 max-h-72 w-[min(100vw-2rem,22rem)] overflow-auto rounded-xl border border-teal-100 bg-white shadow-lg">
          {searchQuery.isFetching ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching formulary…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              No medicines found for “{trimmed}” in your organization.
            </div>
          ) : (
            <ul className="divide-y divide-border/60 py-1">
              {results.map((medicine) => (
                <li
                  key={medicine.id}
                  className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-teal-50/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {medicine.name}
                      {medicine.strength ? (
                        <span className="ml-1 font-normal text-muted-foreground">
                          {medicine.strength}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs font-medium text-teal-700">
                      {formatMedicineCost(medicine.cost)}
                      {medicine.form ? (
                        <span className="ml-2 font-normal text-muted-foreground">
                          {medicine.form}
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {medicine.matchedConditions.length > 0 ? (
                        medicine.matchedConditions.map((condition) => (
                          <Badge
                            key={`${medicine.id}-${condition}`}
                            variant="secondary"
                            className="rounded-full text-[10px] capitalize"
                          >
                            <Check className="mr-1 h-3 w-3 text-teal-600" />
                            {condition}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {medicine.genericName || medicine.brandName || "Match by name"}
                        </span>
                      )}
                      {medicine.matchPriority === "all" ? (
                        <Badge className="rounded-full bg-teal-600 text-[10px]">
                          All conditions
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-full border-teal-200 text-teal-700 hover:bg-teal-50"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onAdd(medicine);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
