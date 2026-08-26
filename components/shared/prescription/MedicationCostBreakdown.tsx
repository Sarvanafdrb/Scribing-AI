import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { PrescriptionBillingItem } from "@/types/prescription.types";
import {
  formatPrescriptionPrice,
  formatUnitPrescriptionPrice,
  getMedicationCostBreakdown,
} from "@/utils/prescriptionPrice.utils";
import { cn } from "@/lib/utils";

interface MedicationCostBreakdownProps {
  medication?: AiNotesMedication;
  billingItem?: PrescriptionBillingItem;
  variant?: "compact" | "detailed";
  mode?: "preview" | "persisted";
  className?: string;
}

const pluralizeUnit = (count: number, unit: string) =>
  count === 1 ? unit : `${unit}s`;

const getPersistedFormUnit = (item: PrescriptionBillingItem) => "tablet";

export function MedicationCostBreakdown({
  medication,
  billingItem,
  variant = "compact",
  mode = "preview",
  className,
}: MedicationCostBreakdownProps) {
  if (mode === "persisted" && billingItem) {
    const formUnit = getPersistedFormUnit(billingItem);
    const {
      unitPriceSnapshot,
      dailyQuantity,
      durationDays,
      totalQuantity,
      dailyCost,
      lineTotalCost,
    } = billingItem;

    if (variant === "compact") {
      return (
        <div
        className={cn(
          "mt-2 space-y-0.5 break-words rounded-xl bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950",
          className,
        )}
        >
          <p>
            <span className="font-medium">Unit:</span>{" "}
            {formatUnitPrescriptionPrice(unitPriceSnapshot, formUnit)}
            {" · "}
            <span className="font-medium">Qty/day:</span> {dailyQuantity}
            {" · "}
            <span className="font-medium">Duration:</span> {durationDays} days
          </p>
          <p>
            <span className="font-medium">Daily:</span>{" "}
            {formatPrescriptionPrice(dailyCost)}
            {" · "}
            <span className="font-medium">Total qty:</span> {totalQuantity}{" "}
            {pluralizeUnit(totalQuantity, formUnit)}
            {" · "}
            <span className="font-medium">Total:</span>{" "}
            {formatPrescriptionPrice(lineTotalCost)}
          </p>
        </div>
      );
    }

    return (
      <dl
        className={cn(
          "mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground",
          className,
        )}
      >
        <div>
          <dt>Unit price</dt>
          <dd className="font-medium text-foreground">
            {formatUnitPrescriptionPrice(unitPriceSnapshot, formUnit)}
          </dd>
        </div>
        <div>
          <dt>Quantity per day</dt>
          <dd className="font-medium text-foreground">{dailyQuantity}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd className="font-medium text-foreground">{durationDays} days</dd>
        </div>
        <div>
          <dt>Total quantity</dt>
          <dd className="font-medium text-foreground">
            {totalQuantity} {pluralizeUnit(totalQuantity, formUnit)}
          </dd>
        </div>
        <div>
          <dt>Daily cost</dt>
          <dd className="font-medium text-foreground">
            {formatPrescriptionPrice(dailyCost)}
          </dd>
        </div>
        <div>
          <dt>Total cost</dt>
          <dd className="font-medium text-foreground">
            {formatPrescriptionPrice(lineTotalCost)}
          </dd>
        </div>
      </dl>
    );
  }

  if (!medication) return null;

  const breakdown = getMedicationCostBreakdown(medication);
  if (!breakdown) return null;

  const {
    unitPrice,
    formUnit,
    dailyQuantity,
    durationDays,
    isOngoing,
    totalQuantity,
    dailyCost,
    courseTotalCost,
    monthlyEstimate,
  } = breakdown;

  if (variant === "compact") {
    const totalLabel =
      courseTotalCost !== null
        ? formatPrescriptionPrice(courseTotalCost)
        : isOngoing
          ? `${formatPrescriptionPrice(monthlyEstimate)}/mo`
          : "—";

    return (
      <div
        className={cn(
          "mt-2 space-y-0.5 break-words rounded-xl bg-teal-50/70 px-3 py-2 text-xs text-teal-900",
          className,
        )}
      >
        <p>
          <span className="font-medium">Unit:</span>{" "}
          {formatUnitPrescriptionPrice(unitPrice, formUnit)}
          {" · "}
          <span className="font-medium">Qty/day:</span> {dailyQuantity}
          {durationDays !== null ? (
            <>
              {" · "}
              <span className="font-medium">Duration:</span> {durationDays} days
            </>
          ) : isOngoing ? (
            <>
              {" · "}
              <span className="font-medium">Duration:</span> Ongoing
            </>
          ) : null}
        </p>
        <p>
          <span className="font-medium">Daily:</span>{" "}
          {formatPrescriptionPrice(dailyCost)}
          {totalQuantity !== null ? (
            <>
              {" · "}
              <span className="font-medium">Total qty:</span> {totalQuantity}{" "}
              {pluralizeUnit(totalQuantity, formUnit)}
            </>
          ) : null}
          {" · "}
          <span className="font-medium">Total:</span> {totalLabel}
        </p>
      </div>
    );
  }

  return (
    <dl
      className={cn(
        "mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <div>
        <dt>Unit price</dt>
        <dd className="font-medium text-foreground">
          {formatUnitPrescriptionPrice(unitPrice, formUnit)}
        </dd>
      </div>
      <div>
        <dt>Quantity per day</dt>
        <dd className="font-medium text-foreground">{dailyQuantity}</dd>
      </div>
      <div>
        <dt>Duration</dt>
        <dd className="font-medium text-foreground">
          {durationDays !== null
            ? `${durationDays} days`
            : isOngoing
              ? "Ongoing (30-day est.)"
              : "—"}
        </dd>
      </div>
      <div>
        <dt>Total quantity</dt>
        <dd className="font-medium text-foreground">
          {totalQuantity !== null
            ? `${totalQuantity} ${pluralizeUnit(totalQuantity, formUnit)}`
            : "—"}
        </dd>
      </div>
      <div>
        <dt>Daily cost</dt>
        <dd className="font-medium text-foreground">
          {formatPrescriptionPrice(dailyCost)}
        </dd>
      </div>
      <div>
        <dt>Total cost</dt>
        <dd className="font-medium text-foreground">
          {courseTotalCost !== null
            ? formatPrescriptionPrice(courseTotalCost)
            : isOngoing
              ? `${formatPrescriptionPrice(monthlyEstimate)} (30 days)`
              : "—"}
        </dd>
      </div>
    </dl>
  );
}
