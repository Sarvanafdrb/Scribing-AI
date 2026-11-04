"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getIpMedicineApiErrorMessage,
  ipMedicineBillingService,
} from "@/services/ip-medicine-billing.service";
import { invalidateAfterIpMedicineDispense } from "@/services/ip-medicine-billing.queries";
import { formatPaiseAsInr } from "@/utils/ip-money.utils";
import {
  buildIpMedicineDispenseOperationKey,
  clearStableClientReferenceId,
  getStableClientReferenceId,
  IP_MEDICINE_CLIENT_REF_PREFIX,
} from "@/utils/ip-medicine-billing.utils";
import type { IpPharmacyOrderLineRow } from "@/utils/ip-pharmacy-desk.utils";
import { safeOptionalText } from "@/utils/ip-pharmacy-desk.utils";
import {
  buildIpPharmacyDispenseRequest,
  validateIpPharmacyDispenseQuantity,
} from "@/utils/ip-pharmacy-dispense.utils";

type IpPharmacyDispenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  row: IpPharmacyOrderLineRow | null;
  admissionDischarged: boolean;
  canDispense: boolean;
};

export function IpPharmacyDispenseDialog({
  open,
  onOpenChange,
  encounterId,
  row,
  admissionDischarged,
  canDispense,
}: IpPharmacyDispenseDialogProps) {
  const queryClient = useQueryClient();
  const [quantityInput, setQuantityInput] = useState("");

  useEffect(() => {
    if (open && row) {
      setQuantityInput(String(row.remainingQuantity));
    }
    if (!open) {
      setQuantityInput("");
    }
  }, [open, row]);

  const operationKey = useMemo(() => {
    if (!row) return "";
    const validation = validateIpPharmacyDispenseQuantity({
      quantityInput: quantityInput || "1",
      remainingQuantity: row.remainingQuantity,
      orderStatus: row.orderStatus,
      admissionDischarged,
      canDispense,
    });
    if (!validation.ok) {
      return buildIpMedicineDispenseOperationKey({
        encounterId,
        orderId: row.orderId,
        prescriptionLineId: row.prescriptionLineId,
        quantity: 0,
      });
    }
    return buildIpMedicineDispenseOperationKey({
      encounterId,
      orderId: row.orderId,
      prescriptionLineId: row.prescriptionLineId,
      quantity: validation.quantity,
    });
  }, [
    admissionDischarged,
    canDispense,
    encounterId,
    quantityInput,
    row,
  ]);

  const dispenseMutation = useMutation({
    mutationFn: async () => {
      if (!row) throw new Error("No order line selected.");
      const validation = validateIpPharmacyDispenseQuantity({
        quantityInput,
        remainingQuantity: row.remainingQuantity,
        orderStatus: row.orderStatus,
        admissionDischarged,
        canDispense,
      });
      if (!validation.ok) {
        throw new Error(validation.message);
      }
      const opKey = buildIpMedicineDispenseOperationKey({
        encounterId,
        orderId: row.orderId,
        prescriptionLineId: row.prescriptionLineId,
        quantity: validation.quantity,
      });
      const clientReferenceId = getStableClientReferenceId(
        opKey,
        IP_MEDICINE_CLIENT_REF_PREFIX.dispense,
      );
      return ipMedicineBillingService.confirmDispense(
        encounterId,
        buildIpPharmacyDispenseRequest({
          orderId: row.orderId,
          prescriptionLineId: row.prescriptionLineId,
          quantity: validation.quantity,
          clientReferenceId,
        }),
      );
    },
    onSuccess: async (result) => {
      if (operationKey) {
        clearStableClientReferenceId(operationKey);
      }
      await invalidateAfterIpMedicineDispense(queryClient, encounterId);
      toast.success(
        result.idempotent
          ? "Dispense already recorded (idempotent retry)."
          : "Medicine dispensed successfully.",
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        getIpMedicineApiErrorMessage(error, "Dispense failed. You can retry."),
      );
    },
  });

  const fieldValidation = row
    ? validateIpPharmacyDispenseQuantity({
        quantityInput,
        remainingQuantity: row.remainingQuantity,
        orderStatus: row.orderStatus,
        admissionDischarged,
        canDispense,
      })
    : null;

  const pending = dispenseMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dispense medicine</DialogTitle>
          <DialogDescription>
            Record a confirmed dispense against this order line. Quantities update
            only after the server confirms success.
          </DialogDescription>
        </DialogHeader>

        {row ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">{row.medicineLabel}</p>
              <p className="text-muted-foreground mt-1">
                Instructions: {safeOptionalText(row.instructions)}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-2">
              <div>
                <dt className="text-muted-foreground">Ordered</dt>
                <dd>{row.authorizedQuantity}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Dispensed</dt>
                <dd>{row.dispensedQuantity}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Remaining</dt>
                <dd>{row.remainingQuantity}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Unit price</dt>
                <dd>{formatPaiseAsInr(row.unitPricePaise)}</dd>
              </div>
            </dl>
            <div className="space-y-2">
              <Label htmlFor="dispense-qty">Dispense quantity</Label>
              <Input
                id="dispense-qty"
                inputMode="numeric"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                disabled={pending}
              />
              {fieldValidation && !fieldValidation.ok ? (
                <p className="text-xs text-destructive">{fieldValidation.message}</p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || row.remainingQuantity <= 0}
                onClick={() =>
                  setQuantityInput(String(row.remainingQuantity))
                }
              >
                Use full remaining ({row.remainingQuantity})
              </Button>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              pending ||
              !row ||
              !fieldValidation?.ok
            }
            onClick={() => dispenseMutation.mutate()}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Dispensing…
              </>
            ) : (
              "Confirm dispense"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
