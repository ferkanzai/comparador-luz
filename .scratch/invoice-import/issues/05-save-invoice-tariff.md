# 05 — Save the invoice's tariff as an offer or the first current tariff

**What to build:** For fixed-price invoices, the review screen offers "save tariff", ticked by default, prefilled from the QR. Without a current tariff it is saved as the current tariff, with a start date the user must enter; otherwise it is saved as an offer. The bill carries the imported tariff snapshot.

**Blocked by:** 03 — Bill breakdown and tax reconciliation.

**Status:** ready-for-agent

- [ ] Only `tc` E* (prices by period) and F* (flat energy price) offer a tariff; other types record the bill only, with an explanation.
- [ ] Prices: `prE*` and `prP*` in €/kW·year with separate period prices.
- [ ] Meter rental: `impOtrosSinIE / days` only when it matches a regulated rental; otherwise empty with a warning that the amount includes other fees.
- [ ] Social-bonus financing: `finBS / days` when positive; whether it is in the IEE base comes from the reconciliation in 03.
- [ ] `checkedOn` = `fFact`; offer expiry stays empty (`finContrato` is not an offer expiry). Name and supplier from the supplier register, editable.
- [ ] Notices for `cambio`, `promo` and `finPen` on the review screen and appended to the tariff's notes.
- [ ] Discount warning when `dto > 0` or `impPot`/`impEner` differ from price × quantity beyond rounding, offering effective rates from billed amounts instead of the list prices.
