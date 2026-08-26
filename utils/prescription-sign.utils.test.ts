import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiNotesMedication } from "@/types/ai-notes.types";
import {
  signedBillingMatchesMedications,
  signPayloadHasBillingFields,
  toSignPrescriptionMedications,
} from "@/utils/prescription-sign.utils";
import type { Prescription } from "@/types/prescription.types";

const med = (overrides: Partial<AiNotesMedication> = {}): AiNotesMedication => ({
  medicine: "Paracetamol 650",
  medicineId: "507f1f77bcf86cd799439011",
  medicineNameSnapshot: "Paracetamol",
  strengthSnapshot: "650",
  formSnapshot: "Tablet",
  catalogCostPreview: 5,
  morning: "1",
  afternoon: "0",
  night: "1",
  days: "3",
  instructions: "After food",
  ...overrides,
});

describe("prescription-sign.utils", () => {
  it("maps clinical medications without billing fields", () => {
    const payload = toSignPrescriptionMedications([med()]);

    assert.equal(payload.length, 1);
    assert.deepEqual(payload[0], {
      medicine: "Paracetamol 650",
      medicineId: "507f1f77bcf86cd799439011",
      medicineNameSnapshot: "Paracetamol",
      strengthSnapshot: "650",
      morning: "1",
      afternoon: "0",
      night: "1",
      days: "3",
      instructions: "After food",
    });
    assert.equal(signPayloadHasBillingFields(payload[0] as Record<string, unknown>), false);
  });

  it("does not include frontend-only preview fields in sign payload", () => {
    const payload = toSignPrescriptionMedications([
      med({
        catalogCostPreview: 5,
        brandNameSnapshot: "Calpol",
        formSnapshot: "Tablet",
        priceAtPrescription: 99,
      }),
    ]);

    const row = payload[0] as Record<string, unknown>;
    assert.equal("catalogCostPreview" in row, false);
    assert.equal("brandNameSnapshot" in row, false);
    assert.equal("formSnapshot" in row, false);
    assert.equal("priceAtPrescription" in row, false);
    assert.equal("dailyCost" in row, false);
    assert.equal("grandTotal" in row, false);
  });

  it("supports multiple medicines in one sign request", () => {
    const payload = toSignPrescriptionMedications([
      med(),
      med({
        medicine: "Azithromycin 500",
        medicineNameSnapshot: "Azithromycin",
        strengthSnapshot: "500",
        morning: "1",
        afternoon: "0",
        night: "0",
        days: "5",
      }),
    ]);

    assert.equal(payload.length, 2);
    assert.equal(payload[1].medicine, "Azithromycin 500");
    assert.equal(payload[1].days, "5");
  });

  it("detects blocked billing fields if accidentally present", () => {
    assert.equal(
      signPayloadHasBillingFields({ medicine: "Test", dailyCost: 10 }),
      true,
    );
    assert.equal(
      signPayloadHasBillingFields({ medicine: "Test", days: "3" }),
      false,
    );
  });

  it("matches signed billing only when every medication row aligns", () => {
    const billing: Prescription = {
      id: "rx-1",
      patientId: "p1",
      sessionId: "s1",
      organizationId: "o1",
      doctorId: "d1",
      status: "signed",
      items: [
        {
          medicineId: "507f1f77bcf86cd799439011",
          medicineNameSnapshot: "Paracetamol",
          strengthSnapshot: "500 mg",
          morning: "1",
          afternoon: "0",
          night: "1",
          dailyQuantity: 2,
          durationDays: 2,
          totalQuantity: 4,
          unitPriceSnapshot: 5,
          dailyCost: 10,
          lineTotalCost: 20,
        },
        {
          medicineId: "507f1f77bcf86cd799439012",
          medicineNameSnapshot: "Paracetamol",
          strengthSnapshot: "650 mg",
          morning: "1",
          afternoon: "0",
          night: "1",
          dailyQuantity: 2,
          durationDays: 3,
          totalQuantity: 6,
          unitPriceSnapshot: 6,
          dailyCost: 12,
          lineTotalCost: 36,
        },
      ],
      subtotal: 56,
      grandTotal: 56,
      signedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const currentMedications = [
      med({
        medicine: "Paracetamol 500 mg",
        medicineId: "507f1f77bcf86cd799439011",
        strengthSnapshot: "500 mg",
        catalogCostPreview: 5,
        days: "2",
      }),
      med({
        medicine: "Paracetamol 650 mg",
        medicineId: "507f1f77bcf86cd799439012",
        strengthSnapshot: "650 mg",
        catalogCostPreview: 6,
        days: "3",
      }),
    ];

    assert.equal(
      signedBillingMatchesMedications(billing, currentMedications),
      true,
    );
    assert.equal(
      signedBillingMatchesMedications(billing, currentMedications.slice(0, 1)),
      false,
    );
    assert.equal(
      signedBillingMatchesMedications(billing, [
        currentMedications[0],
        { ...currentMedications[1], days: "5" },
      ]),
      false,
    );
  });
});
