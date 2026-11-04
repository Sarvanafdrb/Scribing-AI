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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getIpMedicineApiErrorMessage,
  ipMedicineBillingService,
} from "@/services/ip-medicine-billing.service";
import {
  invalidateAfterIpMedicinePayment,
  ipMedicineBillingKeys,
} from "@/services/ip-medicine-billing.queries";
import type {
  IpMedicineBalance,
  IpMedicineCharge,
} from "@/types/ip-medicine-billing.types";
import {
  clearStableClientReferenceId,
  getStableClientReferenceId,
  IP_MEDICINE_CLIENT_REF_PREFIX,
} from "@/utils/ip-medicine-billing.utils";
import { formatPaiseAsInr, rupeesInputToPaise } from "@/utils/ip-money.utils";
import {
  buildEligibleDispenseChargeTargets,
  buildIpPharmacyPaymentAttemptKey,
  IP_MEDICINE_PAYMENT_METHODS,
  summarizeMedicineBalanceForPayment,
  validateIpPharmacyMedicinePayment,
  type IpPharmacyPaymentAllocationDraft,
} from "@/utils/ip-pharmacy-payment.utils";

type IpPharmacyPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  charges: IpMedicineCharge[] | undefined;
  balance: IpMedicineBalance | undefined;
  admissionDischarged: boolean;
  canRecord: boolean;
};

export function IpPharmacyPaymentDialog({
  open,
  onOpenChange,
  encounterId,
  charges,
  balance,
  admissionDischarged,
  canRecord,
}: IpPharmacyPaymentDialogProps) {
  const queryClient = useQueryClient();
  const [attemptId, setAttemptId] = useState("");
  const [method, setMethod] = useState<"cash" | "upi" | "card" | "other">("cash");
  const [receiptReference, setReceiptReference] = useState("");
  const [allocRows, setAllocRows] = useState<IpPharmacyPaymentAllocationDraft[]>(
    [],
  );

  const eligibleCharges = useMemo(
    () => buildEligibleDispenseChargeTargets(charges),
    [charges],
  );

  const balanceSummary = useMemo(
    () => summarizeMedicineBalanceForPayment(balance),
    [balance],
  );

  useEffect(() => {
    if (!open) return;
    const nextAttemptId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setAttemptId(nextAttemptId);
    setMethod("cash");
    setReceiptReference("");
    setAllocRows(
      eligibleCharges.map((c) => ({
        chargeId: c.chargeId,
        amountRupees: "",
      })),
    );
  }, [open, eligibleCharges]);

  const allocationTotalPaise = useMemo(
    () =>
      allocRows.reduce((sum, row) => {
        const paise = rupeesInputToPaise(row.amountRupees);
        return sum + (paise ?? 0);
      }, 0),
    [allocRows],
  );

  const clientReferenceId = useMemo(() => {
    if (!attemptId) return "";
    return getStableClientReferenceId(
      buildIpPharmacyPaymentAttemptKey(encounterId, attemptId),
      IP_MEDICINE_CLIENT_REF_PREFIX.payment,
    );
  }, [attemptId, encounterId]);

  const validationPreview = validateIpPharmacyMedicinePayment({
    canRecord,
    admissionDischarged,
    eligibleCharges,
    method,
    receiptReference,
    clientReferenceId,
    allocationDrafts: allocRows,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const validated = validateIpPharmacyMedicinePayment({
        canRecord,
        admissionDischarged,
        eligibleCharges,
        method,
        receiptReference,
        clientReferenceId,
        allocationDrafts: allocRows,
      });
      if (!validated.ok) {
        throw new Error(validated.message);
      }
      return ipMedicineBillingService.recordPayment(encounterId, validated);
    },
    onSuccess: async (result) => {
      if (attemptId) {
        clearStableClientReferenceId(
          buildIpPharmacyPaymentAttemptKey(encounterId, attemptId),
        );
      }
      await invalidateAfterIpMedicinePayment(queryClient, encounterId);
      const refreshed = await queryClient.fetchQuery({
        queryKey: ipMedicineBillingKeys.balance(encounterId),
        queryFn: () => ipMedicineBillingService.getBalance(encounterId),
      });
      toast.success(
        result.idempotent
          ? `Payment already recorded (idempotent retry). Outstanding: ${formatPaiseAsInr(refreshed.outstandingPaise)}.`
          : `Medicine payment recorded. Outstanding: ${formatPaiseAsInr(refreshed.outstandingPaise)}.`,
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        getIpMedicineApiErrorMessage(
          error,
          "Payment failed. Retry uses the same client reference.",
        ),
      );
    },
  });

  const pending = payMutation.isPending;

  const setAllocAmount = (chargeId: string, amountRupees: string) => {
    setAllocRows((rows) =>
      rows.map((r) =>
        r.chargeId === chargeId ? { ...r, amountRupees } : r,
      ),
    );
  };

  const fillOutstanding = (chargeId: string, outstandingPaise: number) => {
    setAllocAmount(chargeId, (outstandingPaise / 100).toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record medicine payment</DialogTitle>
          <DialogDescription>
            Allocate a single payment across confirmed dispense charges. Totals
            update only after the server confirms success.
          </DialogDescription>
        </DialogHeader>

        {balanceSummary ? (
          <div className="rounded-2xl border border-border/60 px-4 py-3 text-sm space-y-1">
            <p>
              Medicine outstanding:{" "}
              <span className="font-semibold">
                {formatPaiseAsInr(balanceSummary.outstandingPaise)}
              </span>
            </p>
            <p className="text-muted-foreground">
              Status: {balanceSummary.paymentStatus}
              {balanceSummary.creditPaise > 0
                ? ` · Credit ${formatPaiseAsInr(balanceSummary.creditPaise)}`
                : ""}
            </p>
          </div>
        ) : null}

        {eligibleCharges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No unpaid dispense charges are available for payment.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {eligibleCharges.map((charge) => {
                const row = allocRows.find((r) => r.chargeId === charge.chargeId);
                return (
                  <div
                    key={charge.chargeId}
                    className="rounded-2xl border border-border/60 p-3 space-y-2"
                  >
                    <div className="text-sm font-medium">{charge.description}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {charge.chargeId}
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Charge</dt>
                        <dd>{formatPaiseAsInr(charge.amountPaise)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Allocated</dt>
                        <dd>{formatPaiseAsInr(charge.allocatedPaise)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Remaining</dt>
                        <dd>{formatPaiseAsInr(charge.outstandingPaise)}</dd>
                      </div>
                    </dl>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Allocation (₹)</Label>
                        <Input
                          inputMode="decimal"
                          value={row?.amountRupees ?? ""}
                          disabled={pending}
                          onChange={(e) =>
                            setAllocAmount(charge.chargeId, e.target.value)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          fillOutstanding(charge.chargeId, charge.outstandingPaise)
                        }
                      >
                        Full
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>Payment total (from allocations)</Label>
              <p className="text-lg font-semibold">
                {formatPaiseAsInr(allocationTotalPaise)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={method}
                onValueChange={(v) =>
                  setMethod(v as "cash" | "upi" | "card" | "other")
                }
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IP_MEDICINE_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt-ref">Receipt reference (optional)</Label>
              <Input
                id="receipt-ref"
                value={receiptReference}
                disabled={pending}
                onChange={(e) => setReceiptReference(e.target.value)}
                maxLength={128}
              />
            </div>

            {!validationPreview.ok && allocationTotalPaise > 0 ? (
              <p className="text-xs text-destructive">{validationPreview.message}</p>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              pending ||
              eligibleCharges.length === 0 ||
              !validationPreview.ok
            }
            onClick={() => payMutation.mutate()}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording…
              </>
            ) : (
              "Record payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
