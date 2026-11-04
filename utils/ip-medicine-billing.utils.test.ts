import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildIpMedicineRefundOperationKey,
  buildIpMedicineReturnOperationKey,
  clearStableClientReferenceId,
  getStableClientReferenceId,
  IP_MEDICINE_CLIENT_REF_PREFIX,
  resetStableClientReferenceIdsForTests,
} from "./ip-medicine-billing.utils";
import { MIN_CLIENT_REFERENCE_LENGTH } from "./ip-admission-billing.utils";

describe("ip-medicine-billing.utils idempotency", () => {
  it("clears stable reference so a retry can mint a new operation", () => {
    resetStableClientReferenceIdsForTests();
    const key = buildIpMedicineReturnOperationKey({
      encounterId: "507f1f77bcf86cd799439011",
      chargeId: "507f1f77bcf86cd799439012",
      quantity: 1,
    });
    const first = getStableClientReferenceId(
      key,
      IP_MEDICINE_CLIENT_REF_PREFIX.return,
    );
    clearStableClientReferenceId(key);
    const second = getStableClientReferenceId(
      key,
      IP_MEDICINE_CLIENT_REF_PREFIX.return,
    );
    assert.notEqual(first, second);
    assert.ok(first.length >= MIN_CLIENT_REFERENCE_LENGTH);
  });

  it("builds refund operation keys from encounter and return charge", () => {
    const key = buildIpMedicineRefundOperationKey({
      encounterId: "507f1f77bcf86cd799439011",
      returnChargeId: "507f1f77bcf86cd799439012",
      amountPaise: 1500,
    });
    assert.match(key, /^refund:/);
    assert.ok(key.includes("1500"));
  });
});
