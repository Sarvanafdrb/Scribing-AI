"use client";

import { Loader2, Pencil, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccessControl } from "@/hooks/useAccessControl";
import type { Medicine } from "@/types/medicine.types";
import { formatMedicineCost } from "@/components/shared/medicine/medicineForm.utils";

interface MedicineTableProps {
  medicines: Medicine[];
  isLoading: boolean;
  variant?: "doctor" | "admin";
  onEdit?: (medicine: Medicine) => void;
  onToggleStatus?: (medicine: Medicine) => void;
}

export function MedicineTable({
  medicines,
  isLoading,
  variant = "admin",
  onEdit,
  onToggleStatus,
}: MedicineTableProps) {
  const { canEditMedicine, canManageMedicineStatus } = useAccessControl();
  const canEdit = canEditMedicine();
  const canToggleStatus = canManageMedicineStatus();
  const activeBadgeClassName =
    variant === "doctor" ? "bg-teal-600" : undefined;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading medicines…
        </div>
      ) : medicines.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          No medicines in this organization yet. Add your first formulary item.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine</TableHead>
              <TableHead>Strength</TableHead>
              <TableHead>Form / Route</TableHead>
              {variant === "admin" ? <TableHead>Cost</TableHead> : null}
              <TableHead>Conditions</TableHead>
              <TableHead>Status</TableHead>
              {(canEdit || canToggleStatus) && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {medicines.map((medicine) => {
              const active = medicine.isActive !== false;
              return (
                <TableRow key={medicine.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{medicine.name}</p>
                      {variant === "doctor" ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            {[medicine.strength, medicine.form]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-teal-700">
                            {formatMedicineCost(medicine.cost)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {medicine.genericName || medicine.brandName || "—"}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{medicine.strength || "—"}</TableCell>
                  <TableCell>
                    {[medicine.form, medicine.route].filter(Boolean).join(" · ") ||
                      "—"}
                  </TableCell>
                  {variant === "admin" ? (
                    <TableCell>{formatMedicineCost(medicine.cost)}</TableCell>
                  ) : null}
                  <TableCell>
                    <div className="flex max-w-[240px] flex-wrap gap-1">
                      {(medicine.indications || []).length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        medicine.indications.slice(0, 4).map((indication) => (
                          <Badge
                            key={indication.id}
                            variant="outline"
                            className="rounded-full text-[10px] capitalize"
                          >
                            {indication.name}
                          </Badge>
                        ))
                      )}
                      {(medicine.indications || []).length > 4 ? (
                        <Badge
                          variant="secondary"
                          className="rounded-full text-[10px]"
                        >
                          +{medicine.indications.length - 4}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={active ? "default" : "secondary"}
                      className={active ? activeBadgeClassName : undefined}
                    >
                      {active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {(canEdit || canToggleStatus) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit && onEdit ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="rounded-full"
                            onClick={() => onEdit(medicine)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {canToggleStatus && onToggleStatus ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="rounded-full"
                            onClick={() => void onToggleStatus(medicine)}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
