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
import { Textarea } from "@/components/ui/textarea";
import {
  getIpMedicineApiErrorMessage,
  ipMedicineBillingService,
} from "@/services/ip-medicine-billing.service";
import { invalidateAfterIpMedicineReturn } from "@/services/ip-medicine-billing.queries";
import {
  clearStableClientReferenceId,
  getStableClientReferenceId,
  IP_MEDICINE_CLIENT_REF_PREFIX,
} from "@/utils/ip-medicine-billing.utils";
import { formatPaiseAsInr } from "@/utils/ip-money.utils";
import {
  buildIpPharmacyReturnAttemptKey,
  validateIpPharmacyReturn,
  type IpPharmacyReturnableDispenseTarget,
} from "@/utils/ip-pharmacy-return.utils";

type IpPharmacyReturnDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  target: IpPharmacyReturnableDispenseTarget | null;
  admissionDischarged: boolean;
  canReturn: boolean;
};

export function IpPharmacyReturnDialog({
  open,
  onOpenChange,
  encounterId,
  target,
  admissionDischarged,
  canReturn,
}: IpPharmacyReturnDialogProps) {
  const queryClient = useQueryClient();
  const [attemptId, setAttemptId] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const nextAttemptId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setAttemptId(nextAttemptId);
    setQuantityInput(
      target ? String(target.remainingReturnableQuantity) : "",
    );
    setNotes("");
  }, [open, target]);

  const clientReferenceId = useMemo(() => {
    if (!attemptId) return "";
    return getStableClientReferenceId(
      buildIpPharmacyReturnAttemptKey(encounterId, attemptId),
      IP_MEDICINE_CLIENT_REF_PREFIX.return,
    );
  }, [attemptId, encounterId]);

  const validation = validateIpPharmacyReturn({
    canReturn,
    admissionDischarged,
    target,
    quantityInput,
    notes,
    clientReferenceId,
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      const validated = validateIpPharmacyReturn({
        canReturn,
        admissionDischarged,
        target,
        quantityInput,
        notes,
        clientReferenceId,
      });
      if (!validated.ok) throw new Error(validated.message);
      return ipMedicineBillingService.recordReturn(encounterId, validated);
    },
    onSuccess: async (result) => {
      if (attemptId) {
        clearStableClientReferenceId(
          buildIpPharmacyReturnAttemptKey(encounterId, attemptId),
        );
      }
      await invalidateAfterIpMedicineReturn(queryClient, encounterId);
      const creditHint =
        result.suggestedRefundPaise > 0
          ? ` Suggested refundable credit for this return: ${formatPaiseAsInr(result.suggestedRefundPaise)} (record a separate refund if paying out).`
          : "";
      toast.success(
        result.idempotent
          ? `Return already recorded (idempotent retry).${creditHint}`
          : `Return adjustment recorded.${creditHint}`,
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        getIpMedicineApiErrorMessage(
          error,
          "Return failed. Retry uses the same client reference.",
        ),
      );
    },
  });

  const pending = returnMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record medicine return</DialogTitle>
          <DialogDescription>
            Creates a return adjustment on the ledger. Cash payout requires a
            separate refund action.
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <div className="space-y-4 text-sm">
            <dl className="grid gap-2 rounded-2xl border border-border/60 p-4">
              <div>
                <dt className="text-muted-foreground">Medicine</dt>
                <dd className="font-medium">{target.medicineLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Dispense reference</dt>
                <dd className="font-mono text-xs">{target.dispenseReference}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Charge</dt>
                <dd className="font-mono text-xs">{target.chargeId}</dd>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <dt className="text-xs text-muted-foreground">Dispensed</dt>
                  <dd>{target.dispensedQuantity}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Returned</dt>
                  <dd>{target.returnedQuantity}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Returnable</dt>
                  <dd className="font-semibold">
                    {target.remainingReturnableQuantity}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="space-y-2">
              <Label htmlFor="return-qty">Return quantity</Label>
              <Input
                id="return-qty"
                inputMode="numeric"
                value={quantityInput}
                disabled={pending}
                onChange={(e) => setQuantityInput(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-notes">Notes (optional)</Label>
              <Textarea
                id="return-notes"
                value={notes}
                disabled={pending}
                maxLength={500}
                rows={2}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {!validation.ok && quantityInput.trim() ? (
              <p className="text-xs text-destructive">{validation.message}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No return target selected.
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
            onClick={() => returnMutation.mutate()}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording…
              </>
            ) : (
              "Record return"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
