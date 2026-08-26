"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { medicineService } from "@/services/medicine.service";
import { medicineKeys } from "@/services/medicine.queries";
import type { MedicineSearchResult } from "@/types/medicine.types";
import { formatMedicineCost } from "@/components/shared/medicine/medicineForm.utils";
import { cn } from "@/lib/utils";

interface MedicineSuggestionPanelProps {
  conditionQuery: string;
  organizationId?: string;
  excludedMedicineIds?: string[];
  onAdd: (medicine: MedicineSearchResult) => void;
  className?: string;
}

export function MedicineSuggestionPanel({
  conditionQuery,
  organizationId,
  excludedMedicineIds = [],
  onAdd,
  className,
}: MedicineSuggestionPanelProps) {
  const trimmed = conditionQuery.trim();

  const suggestionsQuery = useQuery({
    queryKey: medicineKeys.search(trimmed, organizationId),
    queryFn: () => medicineService.search(trimmed, organizationId),
    enabled: trimmed.length >= 2,
    staleTime: 30 * 1000,
  });

  const suggestions = useMemo(() => {
    const excluded = new Set(excludedMedicineIds.filter(Boolean));
    return (suggestionsQuery.data || [])
      .filter((medicine) => !excluded.has(medicine.id))
      .slice(0, 6);
  }, [excludedMedicineIds, suggestionsQuery.data]);

  if (!trimmed) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 px-4 py-5",
          className,
        )}
      >
        <p className="text-sm font-medium text-foreground">
          No diagnosis detected for suggestions
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add medicines manually using condition search below.
        </p>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-teal-200 bg-teal-50/50 p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-teal-950">
            Suggested for diagnosis
          </p>
          <p className="mt-0.5 text-xs text-teal-800">{trimmed}</p>
        </div>
        {suggestionsQuery.isFetching ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-teal-700" />
        ) : null}
      </div>

      {suggestionsQuery.isLoading || suggestionsQuery.isFetching ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-teal-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          Finding medicines from your formulary…
        </div>
      ) : suggestions.length === 0 ? (
        <p className="mt-4 text-sm text-teal-800">
          No formulary matches for this diagnosis. Search manually or add a
          medicine.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {suggestions.map((medicine) => (
            <li
              key={medicine.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-teal-100 bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {medicine.name}
                  {medicine.strength ? (
                    <span className="ml-1 font-normal text-muted-foreground">
                      {medicine.strength}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs font-medium text-teal-700">
                  {formatMedicineCost(medicine.cost)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {medicine.matchedConditions.slice(0, 2).map((condition) => (
                    <Badge
                      key={`${medicine.id}-${condition}`}
                      variant="secondary"
                      className="rounded-full text-[10px] capitalize"
                    >
                      <Check className="mr-1 h-3 w-3 text-teal-600" />
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 rounded-full bg-teal-700 text-white hover:bg-teal-800"
                onClick={() => onAdd(medicine)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
