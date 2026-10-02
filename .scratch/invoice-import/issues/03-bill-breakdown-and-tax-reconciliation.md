# 03 — Bill breakdown and tax reconciliation

**What to build:** An imported bill gets a breakdown that reconciles with its net amount paid. IEE and IVA are not in the QR, so they are calculated with the rates in force, and the reconciliation tells whether social-bonus financing is inside or outside the IEE base. When the QR carries pre-tax adjustments the breakdown cannot represent, or the totals do not reconcile, the bill is recorded without a breakdown and the review screen explains why.

**Blocked by:** 01 — Import an invoice image and record its bill.

**Status:** ready-for-agent

- [ ] Breakdown: energy `impEner`, power `impPot`, social-bonus financing `finBS` (0 when `-1` or `0`), meter rental `impOtrosSinIE`, services `impSA`, SNOEE 0, IEE calculated, IVA and services IVA calculated, with the last cent absorbing rounding so the breakdown equals `imp`.
- [ ] Reconciliation tries social-bonus financing inside and outside the IEE base and keeps whichever reproduces `imp` within rounding; the result is available to later tickets.
- [ ] The worked example reconciles with social-bonus financing outside the IEE base.
- [ ] Non-zero `dto`, `exc`, `impOtrosConIE` or `ajuste`, or a failed reconciliation, records the bill without a breakdown, with a visible reason.
