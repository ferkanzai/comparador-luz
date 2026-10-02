# 06 — Match the current tariff or record a price change

**What to build:** When a current tariff exists, the import compares prices with it. Matching prices create no new tariff; the bill just keeps the snapshot. Different prices offer a choice between a tariff price change from a date and saving as an offer.

**Blocked by:** 05 — Save the invoice's tariff as an offer or the first current tariff.

**Status:** ready-for-agent

- [ ] Same energy and power prices as the current tariff: no tariff is created and the review screen says so.
- [ ] Different prices: price change preselected, with an empty, required date (the QR does not say when prices changed); saving uses the existing price-change flow and preserves the previous terms in the tariff history.
- [ ] Choosing "save as offer" adds a candidate and leaves the current tariff untouched.
