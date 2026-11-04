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
import { Textarea } from "@/components/ui/textarea";
import {
  getIpMedicineApiErrorMessage,
  ipMedicineBillingService,
} from "@/services/ip-medicine-billing.service";
import {
  invalidateAfterIpMedicineRefund,
  ipMedicineBillingKeys,
} from "@/services/ip-medicine-billing.queries";
import type { IpMedicineBalance } from "@/types/ip-medicine-billing.types";
import {
  clearStableClientReferenceId,
  getStableClientReferenceId,
  IP_MEDICINE_CLIENT_REF_PREFIX,
} from "@/utils/ip-medicine-billing.utils";
import { formatPaiseAsInr, rupeesInputToPaise } from "@/utils/ip-money.utils";
import { IP_MEDICINE_PAYMENT_METHODS } from "@/utils/ip-pharmacy-payment.utils";
import {
  buildIpPharmacyRefundAttemptKey,
  validateIpPharmacyRefund,
  type IpPharmacyRefundableReturnTarget,
} from "@/utils/ip-pharmacy-refund.utils";

type IpPharmacyRefundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  target: IpPharmacyRefundableReturnTarget | null;
  admissionDischarged: boolean;
  canRefund: boolean;
};

export function IpPharmacyRefundDialog({
  open,
  onOpenChange,
  encounterId,
  target,
  admissionDischarged,
  canRefund,
}: IpPharmacyRefundDialogProps) {
  const queryClient = useQueryClient();
  const [attemptId, setAttemptId] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [method, setMethod] = useState<"cash" | "upi" | "card" | "other">("cash");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    const nextAttemptId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setAttemptId(nextAttemptId);
    setAmountRupees(
      target ? (target.maxRefundPaise / 100).toFixed(2) : "",
    );
    setMethod("cash");
    setReason("");
  }, [open, target]);

  const clientReferenceId = useMemo(() => {
    if (!attemptId) return "";
    return getStableClientReferenceId(
      buildIpPharmacyRefundAttemptKey(encounterId, attemptId),
      IP_MEDICINE_CLIENT_REF_PREFIX.refund,
    );
  }, [attemptId, encounterId]);

  const validation = validateIpPharmacyRefund({
    canRefund,
    admissionDischarged,
    target,
    amountRupees,
    method,
    reason,
    clientReferenceId,
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      const validated = validateIpPharmacyRefund({
        canRefund,
        admissionDischarged,
        target,
        amountRupees,
        method,
        reason,
        clientReferenceId,
      });
      if (!validated.ok) throw new Error(validated.message);
      return ipMedicineBillingService.recordRefund(encounterId, validated);
    },
    onSuccess: async (result) => {
      if (attemptId) {
        clearStableClientReferenceId(
          buildIpPharmacyRefundAttemptKey(encounterId, attemptId),
        );
      }
      await invalidateAfterIpMedicineRefund(queryClient, encounterId);
      const refreshed = (await queryClient.fetchQuery({
        queryKey: ipMedicineBillingKeys.balance(encounterId),
        queryFn: () => ipMedicineBillingService.getBalance(encounterId),
      })) as IpMedicineBalance;
      toast.success(
        result.idempotent
          ? `Refund already recorded (idempotent retry). Credit: ${formatPaiseAsInr(refreshed.creditPaise)}.`
          : `Refund recorded. Credit: ${formatPaiseAsInr(refreshed.creditPaise)}.`,
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        getIpMedicineApiErrorMessage(
          error,
          "Refund failed. Retry uses the same client reference.",
        ),
      );
    },
  });

  const pending = refundMutation.isPending;
  const amountPreviewPaise = rupeesInputToPaise(amountRupees) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record medicine refund</DialogTitle>
          <DialogDescription>
            Pays out credit linked to a return adjustment. This is not the same
            as recording the return itself.
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <div className="space-y-4 text-sm">
            <dl className="grid gap-2 rounded-2xl border border-border/60 p-4">
              <div>
                <dt className="text-muted-foreground">Return adjustment</dt>
                <dd className="font-mono text-xs">{target.returnChargeId}</dd>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Return amount
                  </dt>
                  <dd>{formatPaiseAsInr(Math.abs(target.returnAmountPaise))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Already refunded
                  </dt>
                  <dd>{formatPaiseAsInr(target.alreadyRefundedPaise)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Remaining for return
                  </dt>
                  <dd>{formatPaiseAsInr(target.remainingRefundablePaise)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Encounter credit (API)
                  </dt>
                  <dd>{formatPaiseAsInr(target.encounterCreditPaise)}</dd>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Maximum this refund:{" "}
                <span className="font-medium text-foreground">
                  {formatPaiseAsInr(target.maxRefundPaise)}
                </span>
              </p>
            </dl>

            <div className="space-y-2">
              <Label htmlFor="refund-amt">Refund amount (₹)</Label>
              <Input
                id="refund-amt"
                inputMode="decimal"
                value={amountRupees}
                disabled={pending}
                onChange={(e) => setAmountRupees(e.target.value)}
              />
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
              <Label htmlFor="refund-reason">Reason (optional)</Label>
              <Textarea
                id="refund-reason"
                value={reason}
                disabled={pending}
                maxLength={500}
                rows={2}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {!validation.ok && amountPreviewPaise > 0 ? (
              <p className="text-xs text-destructive">{validation.message}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No return adjustment selected for refund.
          </p>
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
            disabled={pending || !target || !validation.ok}
            onClick={() => refundMutation.mutate()}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording…
              </>
            ) : (
              "Record refund"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
