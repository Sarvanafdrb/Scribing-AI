"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAccessControl } from "@/hooks/useAccessControl";
import { patientService } from "@/services/patient.service";
import {
  getIpAdmissionApiErrorMessage,
  ipAdmissionBillingService,
} from "@/services/ip-admission-billing.service";
import {
  invalidateIpAdmissionBillingEncounter,
  ipAdmissionBillingKeys,
} from "@/services/ip-admission-billing.queries";
import type { IpOtherCharge, IpRoomRentCharge } from "@/types/ip-admission-billing.types";
import { getPatientFullName } from "@/utils/patient.utils";
import {
  buildRoomRentCorrectionPayload,
  buildChargeAllocationTargets,
  extractSnapshotStoredInvoice,
  pickLatestStatementRevision,
  snapshotFinancialsDifferFromLive,
  sumCorrectionsForCharge,
  validateConsolidatedInvoiceTotals,
  validatePaymentAllocations,
  validateRoomRentCorrectionForm,
} from "@/utils/ip-admission-billing.utils";
import {
  formatPaiseAsInr,
  generateClientReferenceId,
  rupeesInputToPaise,
} from "@/utils/ip-money.utils";

interface RoomRentCorrectionDialogProps {
  encounterId: string;
  charge: IpRoomRentCharge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correctedPaise: number;
}

export function RoomRentCorrectionDialog({
  encounterId,
  charge,
  open,
  onOpenChange,
  correctedPaise,
}: RoomRentCorrectionDialogProps) {
  const queryClient = useQueryClient();
  const { canEditIpAdmissionBilling } = useAccessControl();
  const [reason, setReason] = useState("");
  const [clientReferenceId, setClientReferenceId] = useState("");
  const [usePartial, setUsePartial] = useState(false);
  const [partialRupees, setPartialRupees] = useState("");

  const correctablePaise = charge
    ? Math.max(
        0,
        Math.min(
          charge.amountPaise - correctedPaise,
          charge.amountPaise - charge.allocatedPaise,
        ),
      )
    : 0;

  const resetForm = () => {
    setReason("");
    setClientReferenceId(generateClientReferenceId("rrc"));
    setUsePartial(false);
    setPartialRupees("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!charge) throw new Error("No charge selected");
      const partialAmountPaise = usePartial
        ? rupeesInputToPaise(partialRupees)
        : null;
      const validation = validateRoomRentCorrectionForm({
        reason,
        clientReferenceId,
        partialAmountPaise,
        usePartial,
      });
      if (validation) throw new Error(validation);
      return ipAdmissionBillingService.correctRoomRent(
        encounterId,
        charge._id,
        buildRoomRentCorrectionPayload({
          reason,
          clientReferenceId,
          partialAmountPaise,
          usePartial,
        }),
      );
    },
    onSuccess: (result) => {
      toast.success(
        result.idempotent
          ? "Correction already recorded (idempotent)."
          : "Room rent correction recorded.",
      );
      queryClient.invalidateQueries({
        queryKey: invalidateIpAdmissionBillingEncounter(encounterId),
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(
        getIpAdmissionApiErrorMessage(error, "Room rent correction failed."),
      );
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          resetForm();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Correct room rent</DialogTitle>
          <DialogDescription>
            {charge
              ? `Charge ${charge.billingDateKey}: gross ${formatPaiseAsInr(charge.amountPaise)}, correctable ${formatPaiseAsInr(correctablePaise)}.`
              : "Select a charge."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="rrc-reason">Reason</Label>
            <Textarea
              id="rrc-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="rrc-ref">Client reference (idempotency)</Label>
            <Input
              id="rrc-ref"
              value={clientReferenceId}
              onChange={(e) => setClientReferenceId(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={usePartial}
              onChange={(e) => setUsePartial(e.target.checked)}
            />
            Partial correction amount
          </label>
          {usePartial ? (
            <div>
              <Label htmlFor="rrc-partial">Amount (₹)</Label>
              <Input
                id="rrc-partial"
                inputMode="decimal"
                value={partialRupees}
                onChange={(e) => setPartialRupees(e.target.value)}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              !canEditIpAdmissionBilling() ||
              !charge ||
              correctablePaise <= 0 ||
              mutation.isPending
            }
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Apply correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface IpBillingDeskProps {
  encounterId: string;
}

export function IpBillingDesk({ encounterId }: IpBillingDeskProps) {
  const queryClient = useQueryClient();
  const {
    canViewIpAdmissionBilling,
    canEditIpAdmissionBilling,
    canRecordIpAdmissionPayment,
  } = useAccessControl();

  const [correctionCharge, setCorrectionCharge] =
    useState<IpRoomRentCharge | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);

  const enabled = Boolean(encounterId) && canViewIpAdmissionBilling();

  const invoiceQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.invoice(encounterId),
    queryFn: () => ipAdmissionBillingService.getInvoice(encounterId),
    enabled,
  });

  const patientQuery = useQuery({
    queryKey: ["patients", invoiceQuery.data?.patientId],
    queryFn: () =>
      patientService.getById(String(invoiceQuery.data!.patientId)),
    enabled: Boolean(invoiceQuery.data?.patientId) && canViewIpAdmissionBilling(),
  });

  const roomRentQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.roomRent(encounterId),
    queryFn: () => ipAdmissionBillingService.listRoomRentCharges(encounterId),
    enabled,
  });

  const correctionsQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.corrections(encounterId),
    queryFn: () =>
      ipAdmissionBillingService.listRoomRentCorrections(encounterId),
    enabled,
  });

  const otherQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.otherCharges(encounterId),
    queryFn: () => ipAdmissionBillingService.listOtherCharges(encounterId),
    enabled,
  });

  const paymentsQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.payments(encounterId),
    queryFn: () => ipAdmissionBillingService.listPayments(encounterId),
    enabled,
  });

  const allocationsQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.allocations(encounterId),
    queryFn: () => ipAdmissionBillingService.listAllocations(encounterId),
    enabled,
  });

  const snapshotQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.discharge(encounterId),
    queryFn: () => ipAdmissionBillingService.getDischargeSnapshot(encounterId),
    enabled,
  });

  const revisionsQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.revisions(encounterId),
    queryFn: () =>
      ipAdmissionBillingService.listStatementRevisions(encounterId),
    enabled,
  });

  const previewQuery = useQuery({
    queryKey: [...ipAdmissionBillingKeys.discharge(encounterId), "preview"],
    queryFn: () => ipAdmissionBillingService.getDischargePreview(encounterId),
    enabled: false,
  });

  const generateRentMutation = useMutation({
    mutationFn: () => ipAdmissionBillingService.generateRoomRent(encounterId, {}),
    onSuccess: (data) => {
      toast.success(
        `Room rent: ${data.created.length} new charge(s), ${data.idempotentCount} skipped (idempotent).`,
      );
      queryClient.invalidateQueries({
        queryKey: invalidateIpAdmissionBillingEncounter(encounterId),
      });
    },
    onError: (error) =>
      toast.error(getIpAdmissionApiErrorMessage(error, "Generate rent failed.")),
  });

  const finalizeMutation = useMutation({
    mutationFn: () =>
      ipAdmissionBillingService.finalizeDischargeStatement(encounterId, {}),
    onSuccess: (data) => {
      toast.success(
        data.idempotent
          ? "Statement already finalized."
          : "Discharge financial statement finalized.",
      );
      queryClient.invalidateQueries({
        queryKey: invalidateIpAdmissionBillingEncounter(encounterId),
      });
    },
    onError: (error) =>
      toast.error(getIpAdmissionApiErrorMessage(error, "Finalize failed.")),
  });

  const activeAllocation = useMemo(
    () =>
      allocationsQuery.data?.find((a) => a.status === "active") ??
      allocationsQuery.data?.[allocationsQuery.data.length - 1],
    [allocationsQuery.data],
  );

  const invoice = invoiceQuery.data;
  const corrections = correctionsQuery.data ?? [];
  const snapshotStoredInvoice = useMemo(
    () => extractSnapshotStoredInvoice(snapshotQuery.data?.snapshot),
    [snapshotQuery.data],
  );
  const latestRevision = useMemo(
    () => pickLatestStatementRevision(revisionsQuery.data ?? []),
    [revisionsQuery.data],
  );
  const invoiceTotalsWarning =
    invoice != null ? validateConsolidatedInvoiceTotals(invoice) : null;
  const snapshotDriftFromLive = useMemo(() => {
    if (!invoice || !snapshotStoredInvoice) return false;
    return snapshotFinancialsDifferFromLive(snapshotStoredInvoice, {
      grossTotalPaise: invoice.grossTotalPaise,
      netPaidPaise: invoice.netPaidPaise,
      balanceDuePaise: invoice.balanceDuePaise,
      creditPaise: invoice.creditPaise,
      successfulPaymentsPaise: invoice.successfulPaymentsPaise,
      successfulRefundsPaise: invoice.successfulRefundsPaise,
    });
  }, [invoice, snapshotStoredInvoice]);

  if (!canViewIpAdmissionBilling()) {
    return (
      <div className="glass rounded-3xl p-8 text-center text-muted-foreground">
        You do not have permission to view IP admission billing.
      </div>
    );
  }

  if (invoiceQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invoiceQuery.isError || !invoice) {
    return (
      <div className="glass rounded-3xl border border-destructive/30 p-8 text-center">
        <p className="text-destructive">
          {getIpAdmissionApiErrorMessage(
            invoiceQuery.error,
            "Unable to load billing for this encounter.",
          )}
        </p>
      </div>
    );
  }

  const patientName = patientQuery.data
    ? getPatientFullName(patientQuery.data)
    : invoice.patientId;

  return (
    <div className="space-y-8">
      <section className="glass rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Admission summary</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Patient</dt>
            <dd className="font-medium">{patientName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Encounter</dt>
            <dd className="font-mono text-xs">{encounterId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Billing bed</dt>
            <dd>
              {activeAllocation
                ? `${activeAllocation.wardNameSnapshot} / ${activeAllocation.roomNumberSnapshot} / ${activeAllocation.bedLabelSnapshot}`
                : "No catalog allocation — clinical ward/bed may differ"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Admission (allocation)</dt>
            <dd>
              {activeAllocation?.startedAt
                ? new Date(activeAllocation.startedAt).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Statement status</dt>
            <dd className="space-y-1">
              {snapshotQuery.data ? (
                <>
                  <Badge variant="secondary">Finalized snapshot on file</Badge>
                  <p className="text-xs text-muted-foreground">
                    Finalized{" "}
                    {new Date(snapshotQuery.data.finalizedAt).toLocaleString()}
                  </p>
                  {latestRevision?.createdAt ? (
                    <p className="text-xs text-muted-foreground">
                      Latest revision{" "}
                      {new Date(latestRevision.createdAt).toLocaleString()}{" "}
                      (rev {latestRevision.revisionNumber})
                    </p>
                  ) : null}
                </>
              ) : (
                <Badge variant="outline">Not finalized</Badge>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {snapshotQuery.data && snapshotDriftFromLive ? (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-foreground">
          <AlertCircle className="text-amber-600" />
          <AlertTitle>Live invoice differs from finalized snapshot</AlertTitle>
          <AlertDescription className="text-foreground/90">
            The discharge statement snapshot is a{" "}
            <strong>historical record</strong> and does not update when you
            record payments, charges, or corrections afterward. Use the{" "}
            <strong>live invoice</strong> below for current balance due and
            credit. If finance requires an updated official statement, create a
            statement revision (management approval may apply) or contact your
            administrator.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="glass rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Live consolidated invoice</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Current ledger totals from the server. Use these amounts for
              collections and balance due today.
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Live balance due</p>
            <p className="text-xl font-semibold tabular-nums">
              {formatPaiseAsInr(invoice.balanceDuePaise)}
            </p>
            <p className="mt-2 text-muted-foreground">Live credit</p>
            <p className="font-medium tabular-nums">
              {formatPaiseAsInr(invoice.creditPaise)}
            </p>
          </div>
        </div>
        {invoiceTotalsWarning ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            Invoice totals from the server look inconsistent ({invoiceTotalsWarning}).
            Refresh or contact support before collecting payment.
          </p>
        ) : null}
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          {[
            ["Room rent (net)", invoice.lineItems.roomRentPaise],
            ["Medicine (net)", invoice.lineItems.medicineNetPaise],
            ["Other charges", invoice.lineItems.otherChargesPaise],
            ["Gross total", invoice.grossTotalPaise],
            ["Successful payments", invoice.successfulPaymentsPaise],
            ["Successful refunds (ledger)", invoice.successfulRefundsPaise],
            ["Net paid", invoice.netPaidPaise],
            ["Balance due (live)", invoice.balanceDuePaise],
            ["Credit (live)", invoice.creditPaise],
          ].map(([label, paise]) => (
            <div key={String(label)}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">
                {formatPaiseAsInr(paise as number)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="glass rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Room rent</h2>
          {canEditIpAdmissionBilling() ? (
            <Button
              size="sm"
              disabled={generateRentMutation.isPending}
              onClick={() => generateRentMutation.mutate()}
            >
              Generate rent
            </Button>
          ) : null}
        </div>
        {roomRentQuery.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : roomRentQuery.data?.length ? (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Corrected</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomRentQuery.data.map((charge) => {
                const corrected = sumCorrectionsForCharge(
                  corrections,
                  charge._id,
                );
                return (
                  <TableRow key={charge._id}>
                    <TableCell>{charge.billingDateKey}</TableCell>
                    <TableCell>{formatPaiseAsInr(charge.amountPaise)}</TableCell>
                    <TableCell>
                      {formatPaiseAsInr(charge.allocatedPaise)}
                    </TableCell>
                    <TableCell>{formatPaiseAsInr(corrected)}</TableCell>
                    <TableCell className="text-right">
                      {canEditIpAdmissionBilling() ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCorrectionCharge(charge);
                            setCorrectionOpen(true);
                          }}
                        >
                          Correct
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No room rent charges.</p>
        )}
        <div>
          <h3 className="text-sm font-medium">Correction audit history</h3>
          {correctionsQuery.isError ? (
            <p className="text-sm text-destructive mt-2">
              Could not load corrections.
            </p>
          ) : corrections.length ? (
            <div className="overflow-x-auto mt-2">
            <Table className="mt-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Charge</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {corrections.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell className="font-mono text-xs">
                      {row.originalChargeId.slice(-6)}
                    </TableCell>
                    <TableCell>{row.kind}</TableCell>
                    <TableCell>{formatPaiseAsInr(row.amountPaise)}</TableCell>
                    <TableCell>{row.reason}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.clientReferenceId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              No corrections recorded.
            </p>
          )}
        </div>
      </section>

      <IpOtherChargesSection encounterId={encounterId} />
      <IpPaymentsSection encounterId={encounterId} />

      <section className="glass rounded-3xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Discharge statement</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview uses the current live ledger. Finalize creates an{" "}
            <strong>immutable historical snapshot</strong> that will not change
            when later transactions are posted.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={previewQuery.isFetching}
            onClick={async () => {
              const result = await previewQuery.refetch();
              if (result.isError) {
                toast.error(
                  getIpAdmissionApiErrorMessage(
                    result.error,
                    "Could not load statement preview.",
                  ),
                );
              }
            }}
          >
            Preview statement
          </Button>
          {canEditIpAdmissionBilling() ? (
            <Button
              size="sm"
              disabled={finalizeMutation.isPending}
              onClick={() => finalizeMutation.mutate()}
            >
              Finalize snapshot
            </Button>
          ) : null}
        </div>
        {previewQuery.isError && !previewQuery.data ? (
          <p className="text-sm text-destructive">
            {getIpAdmissionApiErrorMessage(
              previewQuery.error,
              "Statement preview unavailable.",
            )}
          </p>
        ) : null}
        {previewQuery.isFetching ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : null}
        {previewQuery.data?.statementText ? (
          <pre className="max-h-64 overflow-auto rounded-xl bg-muted/50 p-4 text-xs whitespace-pre-wrap">
            {previewQuery.data.statementText}
          </pre>
        ) : null}
        {snapshotQuery.data ? (
          <div className="rounded-xl border p-4 text-sm space-y-3">
            <div>
              <p className="font-medium">Finalized discharge snapshot (historical)</p>
              <p className="text-muted-foreground text-xs mt-1">
                Finalized{" "}
                {new Date(snapshotQuery.data.finalizedAt).toLocaleString()}
                {latestRevision?.createdAt ? (
                  <>
                    {" "}
                    · Latest revision{" "}
                    {new Date(latestRevision.createdAt).toLocaleString()} (rev{" "}
                    {latestRevision.revisionNumber})
                  </>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This snapshot does not automatically update after subsequent
                payments, charges, or corrections. Compare snapshot balance to
                live balance due above.
              </p>
            </div>
            {snapshotStoredInvoice ? (
              <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div>
                  <dt className="text-muted-foreground">Snapshot balance due</dt>
                  <dd className="font-medium tabular-nums">
                    {formatPaiseAsInr(snapshotStoredInvoice.balanceDuePaise ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Snapshot credit</dt>
                  <dd className="font-medium tabular-nums">
                    {formatPaiseAsInr(snapshotStoredInvoice.creditPaise ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Snapshot gross</dt>
                  <dd className="font-medium tabular-nums">
                    {formatPaiseAsInr(snapshotStoredInvoice.grossTotalPaise ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Snapshot net paid</dt>
                  <dd className="font-medium tabular-nums">
                    {formatPaiseAsInr(snapshotStoredInvoice.netPaidPaise ?? 0)}
                  </dd>
                </div>
              </dl>
            ) : null}
            <pre className="max-h-40 overflow-auto text-xs whitespace-pre-wrap rounded-lg bg-muted/50 p-3">
              {snapshotQuery.data.statementText}
            </pre>
          </div>
        ) : null}
        {revisionsQuery.data?.length ? (
          <div>
            <h3 className="text-sm font-medium">Financial revisions</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {revisionsQuery.data.map((rev) => (
                <li key={rev._id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge>Rev {rev.revisionNumber}</Badge>
                    <span>{rev.reason}</span>
                  </div>
                  {rev.snapshot?.financialDiff ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Δ gross{" "}
                      {formatPaiseAsInr(rev.snapshot.financialDiff.grossTotalPaise)}{" "}
                      · Δ balance{" "}
                      {formatPaiseAsInr(rev.snapshot.financialDiff.balanceDuePaise)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <RoomRentCorrectionDialog
        encounterId={encounterId}
        charge={correctionCharge}
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        correctedPaise={
          correctionCharge
            ? sumCorrectionsForCharge(corrections, correctionCharge._id)
            : 0
        }
      />
    </div>
  );
}

function IpOtherChargesSection({ encounterId }: { encounterId: string }) {
  const queryClient = useQueryClient();
  const { canEditIpAdmissionBilling } = useAccessControl();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<
    "lab" | "procedure" | "nursing" | "equipment" | "miscellaneous" | "other"
  >("lab");
  const [quantity, setQuantity] = useState("1");
  const [unitRupees, setUnitRupees] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<IpOtherCharge | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const query = useQuery({
    queryKey: ipAdmissionBillingKeys.otherCharges(encounterId),
    queryFn: () => ipAdmissionBillingService.listOtherCharges(encounterId),
    enabled: Boolean(encounterId),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const unitPricePaise = rupeesInputToPaise(unitRupees);
      const qty = Number.parseFloat(quantity);
      if (unitPricePaise == null || !Number.isFinite(qty) || qty <= 0) {
        throw new Error("Invalid charge inputs.");
      }
      return ipAdmissionBillingService.createOtherCharge(encounterId, {
        category,
        description: description.trim(),
        quantity: qty,
        unitPricePaise,
        sourceReferenceId: generateClientReferenceId("oth"),
      });
    },
    onSuccess: () => {
      toast.success("Other charge added.");
      queryClient.invalidateQueries({
        queryKey: invalidateIpAdmissionBillingEncounter(encounterId),
      });
      setOpen(false);
    },
    onError: (error) =>
      toast.error(getIpAdmissionApiErrorMessage(error, "Could not add charge.")),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      ipAdmissionBillingService.cancelOtherCharge(encounterId, id, reason),
    onSuccess: () => {
      toast.success("Charge cancelled.");
      queryClient.invalidateQueries({
        queryKey: invalidateIpAdmissionBillingEncounter(encounterId),
      });
      setCancelOpen(false);
      setCancelTarget(null);
      setCancelReason("");
    },
    onError: (error) =>
      toast.error(getIpAdmissionApiErrorMessage(error, "Cancel failed.")),
  });

  return (
    <section className="glass rounded-3xl p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="text-lg font-semibold">Other charges</h2>
        {canEditIpAdmissionBilling() ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            Add charge
          </Button>
        ) : null}
      </div>
      {query.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : query.data?.length ? (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map((row) => (
              <TableRow key={row._id}>
                <TableCell>{row.description}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{formatPaiseAsInr(row.amountPaise)}</TableCell>
                <TableCell>
                  {row.status === "active" ? (
                    <Badge>Active</Badge>
                  ) : (
                    <Badge variant="secondary">Cancelled</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canEditIpAdmissionBilling() &&
                  row.status === "active" &&
                  row.allocatedPaise === 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCancelTarget(row);
                        setCancelReason("");
                        setCancelOpen(true);
                      }}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No other charges.</p>
      )}

      <Dialog open={open} onOpenChange={(next) => {
        if (!createMutation.isPending) setOpen(next);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add other charge</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as typeof category)
                }
              >
                <option value="lab">Lab</option>
                <option value="procedure">Procedure</option>
                <option value="nursing">Nursing</option>
                <option value="equipment">Equipment</option>
                <option value="miscellaneous">Miscellaneous</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Quantity</Label>
                <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div>
                <Label>Unit price (₹)</Label>
                <Input value={unitRupees} onChange={(e) => setUnitRupees(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelOpen}
        onOpenChange={(next) => {
          if (!next && !cancelMutation.isPending) {
            setCancelOpen(false);
            setCancelTarget(null);
            setCancelReason("");
          } else if (next) {
            setCancelOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel other charge</DialogTitle>
            <DialogDescription>
              {cancelTarget
                ? `Cancel “${cancelTarget.description}” (${formatPaiseAsInr(cancelTarget.amountPaise)}). This cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Cancellation reason</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Required reason for audit"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={cancelMutation.isPending}
              onClick={() => {
                setCancelOpen(false);
                setCancelTarget(null);
                setCancelReason("");
              }}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              disabled={
                cancelMutation.isPending || !cancelReason.trim() || !cancelTarget
              }
              onClick={() => {
                if (!cancelTarget || !cancelReason.trim()) return;
                cancelMutation.mutate({
                  id: cancelTarget._id,
                  reason: cancelReason.trim(),
                });
              }}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling…
                </>
              ) : (
                "Confirm cancellation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
function IpPaymentsSection({ encounterId }: { encounterId: string }) {
  const queryClient = useQueryClient();
  const { canRecordIpAdmissionPayment, canViewIpAdmissionBilling } =
    useAccessControl();
  const [open, setOpen] = useState(false);
  const [amountRupees, setAmountRupees] = useState("");
  const [method, setMethod] = useState<"cash" | "upi" | "card" | "other">("cash");
  const [clientReferenceId, setClientReferenceId] = useState("");
  const [allocRows, setAllocRows] = useState<
    Array<{ rowId: string; chargeKey: string; amountRupees: string }>
  >([]);

  const paymentsQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.payments(encounterId),
    queryFn: () => ipAdmissionBillingService.listPayments(encounterId),
    enabled: canViewIpAdmissionBilling(),
  });

  const invoiceQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.invoice(encounterId),
    queryFn: () => ipAdmissionBillingService.getInvoice(encounterId),
    enabled: canViewIpAdmissionBilling(),
  });

  const roomRentQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.roomRent(encounterId),
    queryFn: () => ipAdmissionBillingService.listRoomRentCharges(encounterId),
    enabled: open,
  });

  const otherQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.otherCharges(encounterId),
    queryFn: () => ipAdmissionBillingService.listOtherCharges(encounterId),
    enabled: open,
  });

  const chargeTargets = useMemo(
    () =>
      buildChargeAllocationTargets({
        roomRent: roomRentQuery.data ?? [],
        otherCharges: otherQuery.data ?? [],
      }),
    [roomRentQuery.data, otherQuery.data],
  );

  const allocOptions = useMemo(() => {
    const rent = (roomRentQuery.data ?? []).map((c) => ({
      id: c._id,
      kind: "room_rent" as const,
      label: `Rent ${c.billingDateKey} (${formatPaiseAsInr(c.amountPaise - c.allocatedPaise)} unallocated)`,
      outstandingPaise: Math.max(0, c.amountPaise - c.allocatedPaise),
    }));
    const other = (otherQuery.data ?? [])
      .filter((c) => c.status === "active")
      .map((c) => ({
        id: c._id,
        kind: "other" as const,
        label: `${c.description} (${formatPaiseAsInr(c.amountPaise - c.allocatedPaise)} unallocated)`,
        outstandingPaise: Math.max(0, c.amountPaise - c.allocatedPaise),
      }));
    return [...rent, ...other].filter((o) => o.outstandingPaise > 0);
  }, [roomRentQuery.data, otherQuery.data]);

  const payMutation = useMutation({
    mutationFn: async () => {
      const amountPaise = rupeesInputToPaise(amountRupees);
      if (amountPaise == null || amountPaise <= 0) {
        throw new Error("Invalid payment amount.");
      }
      if (clientReferenceId.trim().length < 8) {
        throw new Error("Client reference must be at least 8 characters.");
      }
      const allocations = allocRows
        .map((row) => {
          const amountRowPaise = rupeesInputToPaise(row.amountRupees);
          if (!row.chargeKey || amountRowPaise == null) return null;
          const [kind, id] = row.chargeKey.split(":");
          if (!id || (kind !== "room_rent" && kind !== "other")) return null;
          return {
            chargeKind: kind as "room_rent" | "other",
            chargeId: id,
            amountPaise: amountRowPaise,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row != null);

      const validationError = validatePaymentAllocations(
        amountPaise,
        allocations,
        chargeTargets,
      );
      if (validationError) {
        throw new Error(validationError);
      }

      return ipAdmissionBillingService.recordPayment(encounterId, {
        amountPaise,
        method,
        clientReferenceId: clientReferenceId.trim(),
        allocations,
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: invalidateIpAdmissionBillingEncounter(encounterId),
      });
      const invoice = await queryClient.fetchQuery({
        queryKey: ipAdmissionBillingKeys.invoice(encounterId),
        queryFn: () => ipAdmissionBillingService.getInvoice(encounterId),
      });
      toast.success(
        result.idempotent
          ? `Payment already recorded. Balance due: ${formatPaiseAsInr(invoice.balanceDuePaise)}`
          : `Payment recorded. Balance due: ${formatPaiseAsInr(invoice.balanceDuePaise)}`,
      );
      setOpen(false);
      setAllocRows([]);
      setAmountRupees("");
    },
    onError: (error) =>
      toast.error(getIpAdmissionApiErrorMessage(error, "Payment failed.")),
  });

  const allocationTotalPaise = useMemo(
    () =>
      allocRows.reduce((sum, row) => {
        const paise = rupeesInputToPaise(row.amountRupees);
        return sum + (paise ?? 0);
      }, 0),
    [allocRows],
  );

  const paymentAmountPaise = rupeesInputToPaise(amountRupees);

  const openPaymentDialog = () => {
    setClientReferenceId(generateClientReferenceId("pay"));
    setAllocRows([
      { rowId: generateClientReferenceId("alloc"), chargeKey: "", amountRupees: "" },
    ]);
    setOpen(true);
  };

  return (
    <section className="glass rounded-3xl p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="text-lg font-semibold">Payments & refunds</h2>
        <div className="flex flex-wrap items-center gap-2">
          {invoiceQuery.data ? (
            <span className="text-sm text-muted-foreground">
              Balance due:{" "}
              <span className="font-medium text-foreground">
                {formatPaiseAsInr(invoiceQuery.data.balanceDuePaise)}
              </span>
            </span>
          ) : null}
          {canRecordIpAdmissionPayment() ? (
            <Button size="sm" onClick={openPaymentDialog}>
              Record payment
            </Button>
          ) : null}
        </div>
      </div>
      <Alert className="border-muted bg-muted/20">
        <AlertCircle />
        <AlertTitle>Payments and ledger refunds</AlertTitle>
        <AlertDescription>
          <strong>Payments</strong> recorded here allocate cash/UPI/card receipts
          to charge lines. Rows marked <strong>refund</strong> in the activity
          list adjust the <strong>financial ledger and encounter credit</strong>
          — they are not confirmation that cash was returned to the patient.
          This desk does not record admission refunds in this release; treasury
          must handle any physical payout separately.
        </AlertDescription>
      </Alert>
      {paymentsQuery.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : paymentsQuery.data?.combined.length ? (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentsQuery.data.combined.map((row) => (
              <TableRow key={`${row.source}-${row.id}`}>
                <TableCell>
                  {new Date(row.recordedAt).toLocaleString()}
                </TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.movement}</TableCell>
                <TableCell>{formatPaiseAsInr(row.amountPaise)}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No payment activity.</p>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!payMutation.isPending) {
            setOpen(next);
            if (!next) setAllocRows([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record admission payment</DialogTitle>
            <DialogDescription>
              Split one payment across room rent and other charges. Allocation
              total must match the payment amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Amount (₹)</Label>
              <Input
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
              />
            </div>
            <div>
              <Label>Method</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Client reference</Label>
              <Input
                value={clientReferenceId}
                onChange={(e) => setClientReferenceId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Allocations</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={allocOptions.length === 0}
                  onClick={() =>
                    setAllocRows((rows) => [
                      ...rows,
                      {
                        rowId: generateClientReferenceId("alloc"),
                        chargeKey: "",
                        amountRupees: "",
                      },
                    ])
                  }
                >
                  Add line
                </Button>
              </div>
              {roomRentQuery.isLoading || otherQuery.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : allocOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No charges with outstanding balance to allocate.
                </p>
              ) : (
                allocRows.map((row) => (
                  <div
                    key={row.rowId}
                    className="grid grid-cols-1 gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_120px_auto]"
                  >
                    <select
                      className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                      value={row.chargeKey}
                      onChange={(e) =>
                        setAllocRows((rows) =>
                          rows.map((r) =>
                            r.rowId === row.rowId
                              ? { ...r, chargeKey: e.target.value }
                              : r,
                          ),
                        )
                      }
                    >
                      <option value="">Select charge…</option>
                      {allocOptions.map((opt) => (
                        <option
                          key={`${opt.kind}:${opt.id}`}
                          value={`${opt.kind}:${opt.id}`}
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="₹ amount"
                      value={row.amountRupees}
                      onChange={(e) =>
                        setAllocRows((rows) =>
                          rows.map((r) =>
                            r.rowId === row.rowId
                              ? { ...r, amountRupees: e.target.value }
                              : r,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={allocRows.length <= 1}
                      onClick={() =>
                        setAllocRows((rows) =>
                          rows.filter((r) => r.rowId !== row.rowId),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
              {paymentAmountPaise != null && paymentAmountPaise > 0 ? (
                <p
                  className={`text-xs ${
                    allocationTotalPaise === paymentAmountPaise
                      ? "text-muted-foreground"
                      : "text-destructive"
                  }`}
                >
                  Allocated {formatPaiseAsInr(allocationTotalPaise)} of{" "}
                  {formatPaiseAsInr(paymentAmountPaise)}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending || allocOptions.length === 0}
            >
              {payMutation.isPending ? (
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
    </section>
  );
}
