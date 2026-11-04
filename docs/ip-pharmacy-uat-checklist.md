# IP Pharmacy — manual UAT checklist

Execute in **staging only** with synthetic patients. Do **not** mark Pass without performing the steps. Leave **Actual result** and **Pass/Fail** blank until executed.

**Tester:** _______________ **Date:** _______________ **Environment (staging URL):** _______________

---

## Preconditions (all scenarios)

| Requirement | Detail |
|-------------|--------|
| Environment | Staging — not production |
| Test patient | IP admission with signed prescription → medicine order lines |
| Roles | Pharmacy role with `IP_MEDICINE_VIEW`; separate users for EDIT-only vs CREATE as noted |
| Billing cross-check user | User with `IP_ADMISSION_VIEW` for consolidated invoice verification (optional; pharmacy user does not need this) |
| Data | Note encounter ID, order line IDs, charge IDs, client references used |

---

## 1. Pharmacy-scoped admission search

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_VIEW` |
| **API** | `GET /api/ip-medicine/encounters?search=&page=&limit=` |
| **Steps** | 1) Log in as pharmacy user (no `IP_ADMISSION_VIEW`) 2) Open `/ip-pharmacy` 3) Search patient name / code / encounter ID 4) Confirm discharged admission appears in results |
| **Expected** | Results list; no clinical notes or billing totals in search rows; pagination works; only org’s encounters |
| **Query invalidation** | N/A (read) |
| **Actual result** | |
| **Pass/Fail** | |

---

## 2. Open IP Pharmacy desk

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_VIEW` |
| **API** | Search header + `GET …/ip-medicine/orders`, `dispenses`, `charges`, `balance`, `payments`, `audit` |
| **Steps** | From search, open encounter desk |
| **Expected** | Desk loads sections: admission, orders, dispense history, charges, payments, refunds, balance, audit; badge “IP Pharmacy” |
| **Actual result** | |
| **Pass/Fail** | |

---

## 3. View signed medicine orders

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_VIEW` |
| **API** | `GET …/ip-medicine/orders` |
| **Steps** | Review order lines: authorized / dispensed / remaining qty, unit price |
| **Expected** | Lines match signed IP prescription; no charge until dispense |
| **Actual result** | |
| **Pass/Fail** | |

---

## 4. Partial dispense

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_EDIT` |
| **API** | `POST …/ip-medicine/dispenses` |
| **Steps** | Dispense qty &lt; remaining on one line; note `clientReferenceId` |
| **Expected** | Confirmed dispense in history; dispense charge for partial qty only; order `dispensedQuantity` increases; idempotent retry same ref does not double charge |
| **Invalidation** | Medicine encounter queries + admission `invoice`, `payments`, `discharge` keys |
| **Actual result** | |
| **Pass/Fail** | |

---

## 5. Dispense remaining quantity

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_EDIT` |
| **API** | `POST …/ip-medicine/dispenses` (new client reference) |
| **Steps** | Dispense remaining qty on same line |
| **Expected** | Second dispense/charge; line remaining → 0; Dispense button hidden |
| **Invalidation** | Same as step 4 |
| **Actual result** | |
| **Pass/Fail** | |

---

## 6. Payment — single dispense charge

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_CREATE` |
| **API** | `POST …/ip-medicine/payments` |
| **Steps** | Record payment allocated fully to one dispense charge (`amountPaise` = sum of allocations) |
| **Expected** | Payment succeeded; charge `allocatedPaise` / outstanding updated after refetch; balance from API |
| **Invalidation** | Medicine encounter + admission invoice/payments/discharge |
| **Actual result** | |
| **Pass/Fail** | |

---

## 7. Payment — multiple dispense charges

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_CREATE` |
| **API** | `POST …/ip-medicine/payments` |
| **Steps** | One payment split across two dispense charges with outstanding &gt; 0 |
| **Expected** | Validation requires allocation total = payment amount; both charges updated |
| **Actual result** | |
| **Pass/Fail** | |

---

## 8. Partial return

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_EDIT` |
| **API** | `POST …/ip-medicine/returns` |
| **Steps** | On dispense charge row → Return; qty &lt; dispensed; optional notes |
| **Expected** | Return adjustment charge (negative amount); returnable qty reduced; toast may show suggested refund credit — **not** automatic cash payout |
| **Invalidation** | Same financial invalidation as dispense |
| **Actual result** | |
| **Pass/Fail** | |

---

## 9. Full return of remaining quantity

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_EDIT` |
| **API** | `POST …/ip-medicine/returns` |
| **Steps** | Return all remaining returnable qty on same dispense charge |
| **Expected** | Cumulative return qty = dispensed qty; Return button gone for that charge |
| **Actual result** | |
| **Pass/Fail** | |

---

## 10. Partial refund on return adjustment

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_CREATE` |
| **API** | `POST …/ip-medicine/refunds` |
| **Steps** | On return charge row → Refund; amount &lt; max shown (min of return remaining refundable and encounter credit) |
| **Expected** | Refund row in Medicine refunds + audit; balance credit reduced; consolidated admission invoice medicine paid/refund totals update |
| **Invalidation** | Medicine encounter + admission invoice/payments/discharge |
| **Actual result** | |
| **Pass/Fail** | |

---

## 11. Remaining eligible refund

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_CREATE` |
| **API** | `POST …/ip-medicine/refunds` |
| **Steps** | Refund remaining eligible amount for same return charge |
| **Expected** | Refund button hidden when `maxRefundPaise` = 0; idempotent retry same client ref |
| **Actual result** | |
| **Pass/Fail** | |

---

## 12. Medicine balance and audit

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_VIEW` |
| **API** | `GET …/balance`, `GET …/audit` |
| **Steps** | Compare balance section to API; review audit timeline (orders, dispenses, charges, payments, refunds) |
| **Expected** | UI shows API `creditPaise`, `outstandingPaise`, etc. without client-side ledger math; audit newest-first |
| **Actual result** | |
| **Pass/Fail** | |

---

## 13. Consolidated admission invoice and unified payments

| Field | Detail |
|-------|--------|
| **Permission** | `IP_ADMISSION_VIEW` (+ medicine view for invoice API) |
| **API** | Admission billing consolidated invoice / payments (separate desk `/ip-billing`) |
| **Steps** | After pharmacy workflow, open same encounter on IP billing desk; compare medicine net, medicine paid, medicine refunds to pharmacy balance |
| **Expected** | `getConsolidatedAdmissionInvoice` medicine breakdown aligns with pharmacy balance; no duplicate counting in unified payment history |
| **Actual result** | |
| **Pass/Fail** | |

---

## 14. Discharged admission read-only

| Field | Detail |
|-------|--------|
| **Permission** | `IP_MEDICINE_VIEW` read; writes blocked |
| **API** | `loadIpEncounterForWrite` → 403 on POST mutations |
| **Steps** | Discharge admission (clinical workflow); reopen pharmacy desk |
| **Expected** | History visible; Dispense / Return / Payment / Refund disabled; API POST returns forbidden for active-admission-only writes |
| **Actual result** | |
| **Pass/Fail** | |

---

## Accounting reconciliation checks (staging)

| Check | Expected | Actual | Pass/Fail |
|-------|----------|--------|-----------|
| Charges only after confirmed dispense | No charge for undispensed qty | | |
| Payment allocations | Only dispense charges with outstanding | | |
| Return adjustments | One negative charge per return POST | | |
| Refund vs return | Refund is separate POST; reduces net paid once | | |
| Refund caps | ≤ per-return refundable and ≤ encounter credit | | |
| Partial pay + partial refund | Balance and invoice remain consistent | | |
| Two admissions same patient | Movements isolated by encounter/org | | |

---

## Negative / security tests

| Scenario | Steps | Expected | Actual | Pass/Fail |
|----------|-------|----------|--------|-----------|
| VIEW-only user | No EDIT/CREATE; force UI hidden | No successful POST | | |
| No `IP_MEDICINE_VIEW` | Navigate `/ip-pharmacy` | Access denied | | |
| `IP_ADMISSION_VIEW` only | No pharmacy route | Cannot open pharmacy desk | | |
| Cross-org encounter ID | API with other org’s encounter | 403 / not found | | |
| Double-click submit | Repeat dispense/pay/return/refund while pending | Single mutation; stable client ref on retry | | |
| Duplicate client reference | Retry same ref after success | Idempotent; no double apply | | |
| Refund before audit loaded | Slow network / block audit | Refund action disabled with message (B.6.1) | | |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Pharmacy tester | | | |
| Billing verifier | | | |
| Engineering | | | |

**Automated tests do not replace this checklist.** Manual staging execution is required before production promotion.
