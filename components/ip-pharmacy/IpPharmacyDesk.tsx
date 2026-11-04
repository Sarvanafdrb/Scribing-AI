"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { AccessDenied } from "@/components/shared/AccessDenied";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { IpPharmacyDispenseDialog } from "@/components/ip-pharmacy/IpPharmacyDispenseDialog";
import { IpPharmacyPaymentDialog } from "@/components/ip-pharmacy/IpPharmacyPaymentDialog";
import { IpPharmacyRefundDialog } from "@/components/ip-pharmacy/IpPharmacyRefundDialog";
import { IpPharmacyReturnDialog } from "@/components/ip-pharmacy/IpPharmacyReturnDialog";
import { useAccessControl } from "@/hooks/useAccessControl";
import { getIpMedicineApiErrorMessage } from "@/services/ip-medicine-billing.service";
import {
  ipMedicineBillingAuditQuery,
  ipMedicineBillingBalanceQuery,
  ipMedicineBillingChargesQuery,
  ipMedicineBillingDispensesQuery,
  ipMedicineBillingOrdersQuery,
  ipMedicineBillingPaymentsQuery,
  ipPharmacyEncounterHeaderQuery,
  refreshIpPharmacyDeskQueries,
} from "@/services/ip-medicine-billing.queries";
import { formatPaiseAsInr } from "@/utils/ip-money.utils";
import {
  buildIpPharmacyAuditTimeline,
  buildIpPharmacyBalanceDisplayRows,
  chargeTypeLabel,
  flattenIpPharmacyOrderLines,
  formatPaymentAllocationsSummary,
  IP_PHARMACY_DESK_SECTIONS,
  isPharmacyAdmissionDischarged,
  pharmacyAdmissionStatusLabel,
  safeOptionalText,
  type IpPharmacyOrderLineRow,
} from "@/utils/ip-pharmacy-desk.utils";
import { canShowDispenseControl } from "@/utils/ip-pharmacy-dispense.utils";
import { canShowRecordMedicinePaymentControl } from "@/utils/ip-pharmacy-payment.utils";
import {
  assessRefundLimitDataReliability,
  buildRefundableReturnTargets,
  canShowRefundMedicineControl,
  type IpPharmacyRefundableReturnTarget,
} from "@/utils/ip-pharmacy-refund.utils";
import {
  buildReturnableDispenseTargets,
  canShowReturnMedicineControl,
  type IpPharmacyReturnableDispenseTarget,
} from "@/utils/ip-pharmacy-return.utils";

type SectionStateProps = {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  isEmpty: boolean;
  emptyMessage: string;
  onRetry?: () => void;
  children: React.ReactNode;
};

function DeskSection({
  title,
  description,
  state,
}: {
  title: string;
  description?: string;
  state: SectionStateProps;
}) {
  return (
    <section className="glass rounded-3xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        ) : null}
      </div>
      {state.isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : state.isError ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">
            {state.errorMessage ?? "Could not load this section."}
          </p>
          {state.onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={state.onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : state.isEmpty ? (
        <p className="text-sm text-muted-foreground">{state.emptyMessage}</p>
      ) : (
        state.children
      )}
    </section>
  );
}

export function IpPharmacyDesk({ encounterId }: { encounterId: string }) {
  const queryClient = useQueryClient();
  const {
    canViewIpMedicineBillingSummary,
    canDispenseIpMedicine,
    canRecordIpMedicinePayment,
  } = useAccessControl();
  const enabled = canViewIpMedicineBillingSummary();
  const canDispense = canDispenseIpMedicine();
  const canReturn = canDispense;
  const canRefund = canRecordIpMedicinePayment();
  const canRecordPayment = canRecordIpMedicinePayment();
  const [dispenseLine, setDispenseLine] = useState<IpPharmacyOrderLineRow | null>(
    null,
  );
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [returnTarget, setReturnTarget] =
    useState<IpPharmacyReturnableDispenseTarget | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [refundTarget, setRefundTarget] =
    useState<IpPharmacyRefundableReturnTarget | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);

  const headerQuery = useQuery({
    ...ipPharmacyEncounterHeaderQuery(encounterId, enabled),
  });
  const ordersQuery = useQuery({
    ...ipMedicineBillingOrdersQuery(encounterId),
    enabled: enabled,
  });
  const dispensesQuery = useQuery({
    ...ipMedicineBillingDispensesQuery(encounterId),
    enabled: enabled,
  });
  const chargesQuery = useQuery({
    ...ipMedicineBillingChargesQuery(encounterId),
    enabled: enabled,
  });
  const balanceQuery = useQuery({
    ...ipMedicineBillingBalanceQuery(encounterId),
    enabled: enabled,
  });
  const paymentsQuery = useQuery({
    ...ipMedicineBillingPaymentsQuery(encounterId),
    enabled: enabled,
  });
  const auditQuery = useQuery({
    ...ipMedicineBillingAuditQuery(encounterId),
    enabled: enabled,
  });

  const admission = headerQuery.data;
  const discharged = isPharmacyAdmissionDischarged(admission?.status);
  const orderLines = useMemo(
    () => flattenIpPharmacyOrderLines(ordersQuery.data),
    [ordersQuery.data],
  );
  const balanceRows = useMemo(
    () => buildIpPharmacyBalanceDisplayRows(balanceQuery.data),
    [balanceQuery.data],
  );
  const auditTimeline = useMemo(
    () => buildIpPharmacyAuditTimeline(auditQuery.data),
    [auditQuery.data],
  );
  const showRecordPayment = canShowRecordMedicinePaymentControl({
    canRecord: canRecordPayment,
    admissionDischarged: discharged,
    charges: chargesQuery.data,
  });
  const returnableTargets = useMemo(
    () =>
      buildReturnableDispenseTargets({
        charges: chargesQuery.data,
        dispenses: dispensesQuery.data,
        orders: ordersQuery.data,
      }),
    [chargesQuery.data, dispensesQuery.data, ordersQuery.data],
  );
  const returnableByChargeId = useMemo(
    () => new Map(returnableTargets.map((t) => [t.chargeId, t] as const)),
    [returnableTargets],
  );
  const refundLimitAssessment = useMemo(
    () =>
      assessRefundLimitDataReliability({
        balance: balanceQuery.data,
        balanceLoaded: balanceQuery.isSuccess && balanceQuery.data != null,
        refunds: auditQuery.data?.refunds,
        auditRefundsLoaded:
          auditQuery.isSuccess &&
          auditQuery.data != null &&
          Array.isArray(auditQuery.data.refunds),
      }),
    [
      auditQuery.data,
      auditQuery.isSuccess,
      balanceQuery.data,
      balanceQuery.isSuccess,
    ],
  );
  const refundableTargets = useMemo(
    () =>
      buildRefundableReturnTargets({
        charges: chargesQuery.data,
        refunds: auditQuery.data?.refunds,
        balance: balanceQuery.data,
        balanceLoaded: balanceQuery.isSuccess && balanceQuery.data != null,
        auditRefundsLoaded:
          auditQuery.isSuccess &&
          auditQuery.data != null &&
          Array.isArray(auditQuery.data.refunds),
      }),
    [
      chargesQuery.data,
      auditQuery.data?.refunds,
      auditQuery.isSuccess,
      auditQuery.data,
      balanceQuery.data,
      balanceQuery.isSuccess,
    ],
  );
  const refundableByReturnChargeId = useMemo(
    () =>
      new Map(refundableTargets.map((t) => [t.returnChargeId, t] as const)),
    [refundableTargets],
  );

  const refreshDesk = () => {
    void refreshIpPharmacyDeskQueries(queryClient, encounterId);
  };

  if (!enabled) {
    return (
      <AccessDenied message="You do not have permission to access IP pharmacy." />
    );
  }

  const openDispense = (row: IpPharmacyOrderLineRow) => {
    setDispenseLine(row);
    setDispenseOpen(true);
  };

  const openReturn = (target: IpPharmacyReturnableDispenseTarget) => {
    setReturnTarget(target);
    setReturnOpen(true);
  };

  const openRefund = (target: IpPharmacyRefundableReturnTarget) => {
    setRefundTarget(target);
    setRefundOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link href="/ip-pharmacy">
            <ArrowLeft className="h-4 w-4" />
            Back to pharmacy search
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={refreshDesk}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="glass rounded-3xl p-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">IP pharmacy desk</h1>
          <Badge variant="secondary">IP Pharmacy</Badge>
          {admission ? (
            <Badge variant={discharged ? "outline" : "default"}>
              {pharmacyAdmissionStatusLabel(admission.status)}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground font-mono">{encounterId}</p>
        {discharged ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Discharged admission</AlertTitle>
            <AlertDescription>
              Medicine history is view-only. Dispense, payment, return, and refund
              actions are not available for discharged admissions.
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-sm text-muted-foreground">
            {canDispense || canRecordPayment
              ? "Dispense, return, payment, and refund actions follow your permissions and admission status."
              : "View-only access. Edit permission is required for dispense and returns; create permission for payments and refunds."}
          </p>
        )}
      </div>

      <IpPharmacyDispenseDialog
        open={dispenseOpen}
        onOpenChange={setDispenseOpen}
        encounterId={encounterId}
        row={dispenseLine}
        admissionDischarged={discharged}
        canDispense={canDispense}
      />

      <IpPharmacyPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        encounterId={encounterId}
        charges={chargesQuery.data}
        balance={balanceQuery.data}
        admissionDischarged={discharged}
        canRecord={canRecordPayment}
      />

      <IpPharmacyReturnDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        encounterId={encounterId}
        target={returnTarget}
        admissionDischarged={discharged}
        canReturn={canReturn}
      />

      <IpPharmacyRefundDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        encounterId={encounterId}
        target={refundTarget}
        admissionDischarged={discharged}
        canRefund={canRefund}
      />

      <DeskSection
        title="Admission details"
        description="Identification and ward placement (no clinical notes or billing totals)."
        state={{
          isLoading: headerQuery.isLoading,
          isError: headerQuery.isError,
          errorMessage: headerQuery.isError
            ? getIpMedicineApiErrorMessage(
                headerQuery.error,
                "Could not load admission details.",
              )
            : undefined,
          isEmpty: !headerQuery.isLoading && !headerQuery.isError && !admission,
          emptyMessage:
            "Admission summary was not found. You can still view medicine ledger sections below if you have access.",
          onRetry: () => void headerQuery.refetch(),
          children: admission ? (
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Patient</dt>
                <dd className="font-medium">
                  {safeOptionalText(admission.patientName)}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {safeOptionalText(admission.patientCode)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Encounter code</dt>
                <dd>{safeOptionalText(admission.encounterCode ?? undefined)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{pharmacyAdmissionStatusLabel(admission.status)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ward / bed</dt>
                <dd>
                  {[admission.ward, admission.bed].filter(Boolean).join(" · ") ||
                    "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Admitted</dt>
                <dd>
                  {admission.admittedAt
                    ? new Date(admission.admittedAt).toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Discharged</dt>
                <dd>
                  {admission.dischargedAt
                    ? new Date(admission.dischargedAt).toLocaleString()
                    : "—"}
                </dd>
              </div>
            </dl>
          ) : null,
        }}
      />

      <DeskSection
        title="Medicine orders"
        state={{
          isLoading: ordersQuery.isLoading,
          isError: ordersQuery.isError,
          errorMessage: ordersQuery.isError
            ? getIpMedicineApiErrorMessage(
                ordersQuery.error,
                "Could not load medicine orders.",
              )
            : undefined,
          isEmpty: !ordersQuery.isLoading && orderLines.length === 0,
          emptyMessage: "No medicine orders for this admission yet.",
          onRetry: () => void ordersQuery.refetch(),
          children: (
            <div className="overflow-x-auto -mx-1 px-1">
              <Table className="min-w-[880px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Instructions</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Dispensed</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead>Order status</TableHead>
                    {canDispense ? <TableHead className="text-right" /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderLines.map((row) => (
                    <TableRow key={`${row.orderId}-${row.lineId}`}>
                      <TableCell className="font-medium">
                        {row.medicineLabel}
                        <div className="text-xs text-muted-foreground">
                          {row.unitOfMeasure}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px]">
                        {safeOptionalText(row.instructions)}
                      </TableCell>
                      <TableCell>{row.authorizedQuantity}</TableCell>
                      <TableCell>{row.dispensedQuantity}</TableCell>
                      <TableCell>{row.remainingQuantity}</TableCell>
                      <TableCell>{formatPaiseAsInr(row.unitPricePaise)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.orderStatus}</Badge>
                      </TableCell>
                      {canDispense ? (
                        <TableCell className="text-right">
                          {canShowDispenseControl({
                            canDispense,
                            admissionDischarged: discharged,
                            row,
                          }) ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openDispense(row)}
                            >
                              Dispense
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ),
        }}
      />

      <DeskSection
        title="Dispense history"
        description="Confirmed dispenses only."
        state={{
          isLoading: dispensesQuery.isLoading,
          isError: dispensesQuery.isError,
          errorMessage: dispensesQuery.isError
            ? getIpMedicineApiErrorMessage(
                dispensesQuery.error,
                "Could not load dispense history.",
              )
            : undefined,
          isEmpty: !dispensesQuery.isLoading && !dispensesQuery.data?.length,
          emptyMessage: "No confirmed dispenses recorded.",
          onRetry: () => void dispensesQuery.refetch(),
          children: (
            <div className="overflow-x-auto -mx-1 px-1">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Client reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dispensesQuery.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {new Date(row.dispensedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>
                        {formatPaiseAsInr(row.chargeAmountPaise)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.clientReferenceId}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ),
        }}
      />

      <DeskSection
        title="Medicine charges"
        description="Dispense charges and return adjustments from the ledger API."
        state={{
          isLoading: chargesQuery.isLoading,
          isError: chargesQuery.isError,
          errorMessage: chargesQuery.isError
            ? getIpMedicineApiErrorMessage(
                chargesQuery.error,
                "Could not load medicine charges.",
              )
            : undefined,
          isEmpty: !chargesQuery.isLoading && !chargesQuery.data?.length,
          emptyMessage: "No medicine charges on this admission.",
          onRetry: () => void chargesQuery.refetch(),
          children: (
            <div className="space-y-4">
              {!refundLimitAssessment.reliable &&
              (chargesQuery.data ?? []).some((c) => c.chargeType === "return") ? (
                <p className="text-xs text-muted-foreground">
                  {refundLimitAssessment.reason ??
                    "Refund limits are unavailable until balance and audit data load."}
                </p>
              ) : null}
              <div className="overflow-x-auto -mx-1 px-1">
              <Table className="min-w-[880px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    {canReturn || canRefund ? (
                      <TableHead className="text-right">Actions</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(chargesQuery.data ?? []).map((row) => {
                    const returnTargetRow =
                      row.chargeType === "dispense"
                        ? returnableByChargeId.get(row.id)
                        : undefined;
                    const refundTargetRow =
                      row.chargeType === "return"
                        ? refundableByReturnChargeId.get(row.id)
                        : undefined;
                    return (
                    <TableRow key={row.id}>
                      <TableCell>{chargeTypeLabel(row.chargeType)}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>{formatPaiseAsInr(row.amountPaise)}</TableCell>
                      <TableCell>{formatPaiseAsInr(row.allocatedPaise)}</TableCell>
                      <TableCell>
                        {formatPaiseAsInr(row.outstandingPaise)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.paymentStatus}</Badge>
                      </TableCell>
                      {canReturn || canRefund ? (
                        <TableCell className="text-right space-x-2">
                          {canShowReturnMedicineControl({
                            canReturn,
                            admissionDischarged: discharged,
                            target: returnTargetRow,
                          }) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                returnTargetRow && openReturn(returnTargetRow)
                              }
                            >
                              Return
                            </Button>
                          ) : null}
                          {canShowRefundMedicineControl({
                            canRefund,
                            refundLimitsReliable: refundLimitAssessment.reliable,
                            admissionDischarged: discharged,
                            target: refundTargetRow,
                          }) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                refundTargetRow && openRefund(refundTargetRow)
                              }
                            >
                              Refund
                            </Button>
                          ) : null}
                          {!returnTargetRow && !refundTargetRow ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
              </div>
            </div>
          ),
        }}
      />

      <DeskSection
        title="Medicine payments"
        state={{
          isLoading: paymentsQuery.isLoading,
          isError: paymentsQuery.isError,
          errorMessage: paymentsQuery.isError
            ? getIpMedicineApiErrorMessage(
                paymentsQuery.error,
                "Could not load medicine payments.",
              )
            : undefined,
          isEmpty: !paymentsQuery.isLoading && !paymentsQuery.data?.length,
          emptyMessage: "No medicine payments recorded.",
          onRetry: () => void paymentsQuery.refetch(),
          children: (
            <div className="space-y-4">
              {showRecordPayment ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPaymentOpen(true)}
                >
                  Record payment
                </Button>
              ) : null}
              <div className="overflow-x-auto -mx-1 px-1">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Allocations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paymentsQuery.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {new Date(row.recordedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="uppercase">{row.method}</TableCell>
                      <TableCell>{formatPaiseAsInr(row.amountPaise)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.clientReferenceId}
                        {row.receiptReference ? (
                          <div className="text-muted-foreground">
                            {row.receiptReference}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs max-w-[240px]">
                        {formatPaymentAllocationsSummary(row)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          ),
        }}
      />

      <DeskSection
        title="Medicine refunds"
        description="Cash/card/UPI refunds against return adjustments (from audit API)."
        state={{
          isLoading: auditQuery.isLoading,
          isError: auditQuery.isError,
          errorMessage: auditQuery.isError
            ? getIpMedicineApiErrorMessage(
                auditQuery.error,
                "Could not load refund history.",
              )
            : undefined,
          isEmpty:
            !auditQuery.isLoading &&
            !(auditQuery.data?.refunds?.length ?? 0),
          emptyMessage: "No medicine refunds recorded.",
          onRetry: () => void auditQuery.refetch(),
          children: (
            <div className="overflow-x-auto -mx-1 px-1">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Return charge</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(auditQuery.data?.refunds ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {new Date(row.recordedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="uppercase">{row.method}</TableCell>
                      <TableCell>{formatPaiseAsInr(row.amountPaise)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.relatedReturnChargeId}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.clientReferenceId}
                        {row.reason ? (
                          <div className="text-muted-foreground">{row.reason}</div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ),
        }}
      />

      <DeskSection
        title="Medicine balance"
        description="Totals from the pharmacy balance API (authoritative)."
        state={{
          isLoading: balanceQuery.isLoading,
          isError: balanceQuery.isError,
          errorMessage: balanceQuery.isError
            ? getIpMedicineApiErrorMessage(
                balanceQuery.error,
                "Could not load medicine balance.",
              )
            : undefined,
          isEmpty: !balanceQuery.isLoading && !balanceQuery.data,
          emptyMessage: "Balance is not available.",
          onRetry: () => void balanceQuery.refetch(),
          children: balanceQuery.data ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Payment status:
                </span>
                <Badge>{balanceQuery.data.paymentStatus}</Badge>
                <span className="text-sm text-muted-foreground">
                  {balanceQuery.data.currency}
                </span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {balanceRows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-2xl border border-border/60 px-4 py-3"
                  >
                    <dt className="text-xs text-muted-foreground">{row.label}</dt>
                    <dd className="text-lg font-semibold">
                      {formatPaiseAsInr(row.paise)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null,
        }}
      />

      <DeskSection
        title="Audit history"
        description="Combined pharmacy ledger events (newest first)."
        state={{
          isLoading: auditQuery.isLoading,
          isError: auditQuery.isError,
          errorMessage: auditQuery.isError
            ? getIpMedicineApiErrorMessage(
                auditQuery.error,
                "Could not load audit history.",
              )
            : undefined,
          isEmpty: !auditQuery.isLoading && auditTimeline.length === 0,
          emptyMessage: "No audit events yet.",
          onRetry: () => void auditQuery.refetch(),
          children: (
            <ul className="space-y-3">
              {auditTimeline.map((event) => (
                <li
                  key={event.id}
                  className="rounded-2xl border border-border/60 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{event.title}</span>
                    <time className="text-xs text-muted-foreground">
                      {new Date(event.at).toLocaleString()}
                    </time>
                  </div>
                  <p className="text-muted-foreground mt-1">{event.detail}</p>
                  {typeof event.amountPaise === "number" ? (
                    <p className="mt-1">{formatPaiseAsInr(event.amountPaise)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ),
        }}
      />

      <p
        className="sr-only"
        data-testid="ip-pharmacy-desk-sections"
        data-sections={IP_PHARMACY_DESK_SECTIONS.join(",")}
      />
    </div>
  );
}
