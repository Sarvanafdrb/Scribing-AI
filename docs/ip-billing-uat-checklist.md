# IP admission billing — manual UAT checklist

Execute in **staging** with test patients only. Do **not** mark Pass without performing the steps. Leave **Actual result** and **Pass/Fail** blank until executed.

**Tester:** _______________ **Date:** _______________ **Environment:** _______________

---

## 1. Admission search & org isolation

| Field | Detail |
|-------|--------|
| **Preconditions** | User A in Org A with `IP_ADMISSION_VIEW`; at least one IP encounter in Org A; User B in Org B |
| **Steps** | 1) Log in as A → `/ip-billing` 2) Search patient from Org A 3) Open billing 4) As B, search same patient name / encounter ID from A |
| **Expected** | A sees admission and opens desk; B sees no Org A rows / cannot access A’s encounter via API |
| **Actual result** | |
| **Pass/Fail** | |

---

## 2. Read-only billing access

| Field | Detail |
|-------|--------|
| **Preconditions** | Role with `IP_ADMISSION_VIEW` only (no EDIT/CREATE) |
| **Steps** | Open desk for test encounter; attempt Generate rent, Add charge, Record payment, Finalize |
| **Expected** | Invoice and lists visible; write actions hidden or API returns 403 if forced |
| **Actual result** | |
| **Pass/Fail** | |

---

## 3. Room rent generation

| Field | Detail |
|-------|--------|
| **Preconditions** | Admitted IP encounter with bed allocation; `IP_ADMISSION_EDIT` |
| **Steps** | Generate room rent twice |
| **Expected** | Charges appear; second run idempotent (no duplicate lines for same day) |
| **Actual result** | |
| **Pass/Fail** | |

---

## 4. Room rent correction & history

| Field | Detail |
|-------|--------|
| **Preconditions** | Active room rent charge; `IP_ADMISSION_EDIT` |
| **Steps** | Correct with reason + client reference; view correction history table |
| **Expected** | Correction row listed; live invoice gross/net adjusts per policy |
| **Actual result** | |
| **Pass/Fail** | |

---

## 5. Other charge create & cancel

| Field | Detail |
|-------|--------|
| **Preconditions** | Admitted encounter; `IP_ADMISSION_EDIT` |
| **Steps** | Add charge; cancel another with reason in dialog |
| **Expected** | Active charge listed; cancelled shows status + reason stored server-side |
| **Actual result** | |
| **Pass/Fail** | |

---

## 6. Single-line payment allocation

| Field | Detail |
|-------|--------|
| **Preconditions** | Outstanding charge; `IP_ADMISSION_CREATE`; active admission |
| **Steps** | Record payment fully allocated to one charge |
| **Expected** | Live balance due decreases; payment row in activity list |
| **Actual result** | |
| **Pass/Fail** | |

---

## 7. Multiple allocation lines

| Field | Detail |
|-------|--------|
| **Preconditions** | Room rent + other charge both outstanding |
| **Steps** | One payment split across two lines (e.g. ₹1200 → ₹1000 rent + ₹200 other) |
| **Expected** | Validation passes; both lines allocated; live balance correct |
| **Actual result** | |
| **Pass/Fail** | |

---

## 8. Duplicate payment prevention

| Field | Detail |
|-------|--------|
| **Preconditions** | Successful payment with known client reference |
| **Steps** | Submit same client reference and payload again (or double-click Record) |
| **Expected** | Idempotent success or single payment row; balance not double-applied |
| **Actual result** | |
| **Pass/Fail** | |

---

## 9. Invoice gross, paid, outstanding, credit

| Field | Detail |
|-------|--------|
| **Preconditions** | Known test charges and payments |
| **Steps** | Compare live invoice section to expected totals |
| **Expected** | Gross = line items sum; net paid = payments − refunds; balance/credit match server rules |
| **Actual result** | |
| **Pass/Fail** | |

---

## 10. Discharge preview & finalization

| Field | Detail |
|-------|--------|
| **Preconditions** | Admitted or discharged encounter; `IP_ADMISSION_EDIT`; `IP_MEDICINE_VIEW` |
| **Steps** | Preview statement; Finalize snapshot; note finalized timestamp |
| **Expected** | Preview shows live text; snapshot created; status shows finalized date |
| **Actual result** | |
| **Pass/Fail** | |

---

## 11. Snapshot immutability

| Field | Detail |
|-------|--------|
| **Preconditions** | Finalized snapshot exists |
| **Steps** | Record payment (while still admitted) or note post-finalize state; reload desk |
| **Expected** | Snapshot text and snapshot balances unchanged; live invoice may change; drift banner if different |
| **Actual result** | |
| **Pass/Fail** | |

---

## 12. Revision history

| Field | Detail |
|-------|--------|
| **Preconditions** | Finalized snapshot; room rent correction after finalize (or manual revision via API) |
| **Steps** | View Financial revisions; check latest revision date in summary |
| **Expected** | Revision listed with reason; original snapshot still unchanged |
| **Actual result** | |
| **Pass/Fail** | |

---

## 13. Post-finalization payment & live invoice

| Field | Detail |
|-------|--------|
| **Preconditions** | Finalized snapshot; patient still admitted |
| **Steps** | Record payment; compare live balance vs snapshot balance due |
| **Expected** | Live balance updates; snapshot balance due unchanged; amber drift warning visible |
| **Actual result** | |
| **Pass/Fail** | |

---

## 14. Post-discharge write block

| Field | Detail |
|-------|--------|
| **Preconditions** | Clinically discharged encounter |
| **Steps** | Attempt record payment or add other charge (API or UI) |
| **Expected** | Forbidden; live read still works |
| **Actual result** | |
| **Pass/Fail** | |

---

## 15. Refund ledger display (read-only)

| Field | Detail |
|-------|--------|
| **Preconditions** | Encounter with admission/medicine refund in unified payments (seed via API if needed) |
| **Steps** | Open Payments section; read ledger refund notice |
| **Expected** | Refund rows visible; copy clarifies ledger not cash payout; no Record refund button |
| **Actual result** | |
| **Pass/Fail** | |

---

## 16. Unauthorized direct API write

| Field | Detail |
|-------|--------|
| **Preconditions** | Token/user without `IP_ADMISSION_CREATE` or `IP_ADMISSION_EDIT` |
| **Steps** | POST payment or POST other charge to encounter API |
| **Expected** | 403 Forbidden |
| **Actual result** | |
| **Pass/Fail** | |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Billing lead | | | |
| Engineering | | | Automated tests: API ___ / web utils ___ |
