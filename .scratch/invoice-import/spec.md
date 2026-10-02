# Import an invoice from its QR code

Design agreed after the completed interview. Implemented (tickets 01–07).

## Agreed direction

- A household uploads an invoice PDF or an image (photo or screenshot) of its QR. The browser finds and decodes the CNMC invoice QR and prefills a review screen. Pasting the URL is not offered: people never see the raw URL, because the comparator redirects.
- Everything runs on the device. The review screen states that the invoice is neither stored nor sent to the server. Guests can import too.
- The review screen has three independent, editable choices, all ticked by default: record the bill, update the comparison profile, save the tariff. Importing another household's invoice needs no special mode; the user unticks what does not apply.
- Entry points: an "Importar factura" action in the Bills tab and in the comparison's empty state.
- CUPS, postal code, `com` after name lookup, `pmaxP*`, `verde`, `rev`, `caP*` and `iniA` are discarded. The postal code is used only to detect the Canary Islands.

## Source format

CNMC Resolución de 6 de octubre de 2022 (BOE-A-2022-16989, Anexo I), in force since 17 Nov 2022: https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-16989. The QR is defined for 2.0TD only.

- URL `https://comparador.cnmc.gob.es/comparador/QRE?...`. Parameters may be separated by `&` or `&amp;` (the spec text uses `&amp;`); key order and case are not significant.
- Decimals use a dot. Dates are `YYYY-MM-DD`.
- `iniF` is excluded and `finF` included, so billing days = `finF − iniF`, matching the app's billing-period duration. `iniF`/`finF` map directly to the bill's start and end dates.
- `prP1`, `prP2` are €/kW·year; `prE1..3` are €/kWh. Both are before taxes **and before discounts**; discounts are inside `impPot`/`impEner` or in `dto`.
- `tc`: first letter A PVPC, B/C/D indexed, E fixed with three prices, F fixed with one price, G flexible bands, H flat rate; second character `1` means a fixed monthly fee.
- `tf`: N normal; A cancelling, R rectifying, C complementary, G regularising (these carry no prices or totals).
- `finBS`: `-1` PVPC, `0` not applicable or built into the price, otherwise the separately billed social-bonus financing.
- `impOtrosSinIE` includes meter rental and other non-IEE fees (connection fees, deposits).
- `cambio` 1 = prices changed within this period, 2 = they change on the next invoice. `promo` 1 = a promotion that does not last the whole contract. `finPen` = date the early-exit penalty ends. `finContrato` = contract end or next renewal.

## Acceptance and rejection

- Reject, with an explanation: Canary Islands postal codes (35xxx, 38xxx), and any `tf` other than N.
- Import with a visible warning: PVPC (`tc` A*) and self-consumption (`exc` > 0). Suppliers send `exc=0` even without self-consumption, so its presence alone does not warn.
- No QR found: explain, and suggest uploading a photo or screenshot of the code.
- Duplicate: if a bill with the same billing period and supplier exists, warn but allow continuing.

## Bill

- Reporting month: the month of `finF` (editable).
- Billing period: `iniF` → `finF`. Net amount paid: `imp`. Credit: 0.
- Recorded consumption: `cfP1..3` as the P1/P2/P3 split; total is their sum.
- Breakdown: energy `impEner`, power `impPot`, social-bonus financing `finBS` (0 when `-1` or `0`), meter rental `impOtrosSinIE`, services `impSA`, SNOEE 0, IEE calculated, IVA calculated with the last cent absorbing rounding so the breakdown reconciles with `imp`. Services IVA follows the same rule.
- Record the bill **without** a breakdown when `dto`, `exc`, `impOtrosConIE` or `ajuste` is non-zero, or when the tax reconciliation below fails. These are pre-tax adjustments; they are not a Credit, which the glossary defines as an after-tax deduction.
- Snapshots: the bill's own profile (this invoice) and the tariff terms as imported.

## Comparison profile

- Basis: this invoice. Days `finF − iniF`, consumption `cfP1..3`, contracted power `pP1`, `pP2`.
- Taxes on, with the IVA and IEE rates in force (`src/lib/regulated-rates.ts`).
- Reconcile against `imp`: try the social-bonus financing inside and outside the IEE base, and keep whichever reproduces `imp` (within rounding). If neither does, warn and skip the bill breakdown.
- When the profile already has values, show before → after (days, kWh per period, power) on the review screen.

## Tariff

- Only `tc` E* (`kind: "periods"`) and F* (`kind: "fixed"`) create a tariff. Indexed (B/C/D), flexible (G) and flat-rate (H) invoices, and PVPC, record the bill only: their prices are this invoice's, not contract prices.
- Prices: `prE*` and `prP*` with `powerUnit: "year"`, `powerKind: "periods"`.
- Discounts: if `dto > 0`, or `impPot`/`impEner` differ from price × quantity beyond rounding, warn and offer effective rates from billed amounts (`tariffFromInvoiceAmounts`) instead of the list prices.
- Meter rental: `impOtrosSinIE / days` only if it matches a regulated rental (`meterRental` in `regulated-rates.ts`); otherwise leave empty and warn that the amount includes other fees.
- Social-bonus financing: `finBS / days` when positive; empty when `0`. `socialInElectricityTax` from the reconciliation above.
- `checkedOn` = `fFact`. `validUntil` stays empty: `finContrato` is a contract end, not an offer expiry.
- Name and supplier: the supplier's cleaned-up name from the bundled CNMC register (title case, legal form such as S.A.U./S.L.U. removed), editable.
- Notices for `cambio`, `promo` and `finPen` appear on the review screen and are appended to the tariff's notes.

### Role of the tariff

Preselected by the household's situation, changeable on review:

1. No current tariff: save as current; its start date is left empty for the user to fill.
2. Current tariff with the same prices: create no tariff; the bill's snapshot is enough.
3. Current tariff with different prices: choose between a tariff price change from a date (empty and required; the QR does not say when) and saving it as an offer.

## Supplier register

`cnmc-suppliers.csv` in this folder is the CNMC register (https://sede.cnmc.gob.es/listado/censo/2, 946 rows). Bundle a code → cleaned name map generated from it, including deregistered (`Baja`) suppliers, because older invoices can name them. Example: `R2-760` → "Octopus Energy España".

## Decoding

- pdf.js renders every PDF page at high resolution; images are decoded directly.
- QR decoding with the native `BarcodeDetector` when available, falling back to `zxing-wasm`.
- Both libraries load only when the import dialog opens.

## Worked example

```
cp=28030&pP1=4.00&pP2=4.00&tc=E0&finContrato=2027-02-27&com=R2-760&cups=…&tf=N
&iniF=2026-08-12&finF=2026-09-10&impOtrosSinIE=0.77&exc=0&fFact=2026-09-16
&caP1=138&caP2=148&caP3=257&iniA=2026-02-27&pmaxP1=3.164&pmaxP2=2.8&rev=0&verde=1
&imp=26.35&cfP1=10&cfP2=10&cfP3=23&ajuste=0&finBS=0.72&impPot=14.38&impEner=4.92
&prP1=35.405365&prP2=9.855365&prE1=0.192000&prE2=0.113000&prE3=0.082000
```

- 29 days. Power: (35.405365 + 9.855365) × 4 kW × 29 / 365 = 14.38 = `impPot`.
- Energy: 10 × 0.192 + 10 × 0.113 + 23 × 0.082 ≈ 4.92 = `impEner`.
- IEE 5.11269632% on 14.38 + 4.92; plus `finBS` 0.72 and `impOtrosSinIE` 0.77; IVA 21% → 26.35 = `imp`. Social-bonus financing is outside the IEE base.
- Meter: 0.77 / 29 = 0.02655 €/day, the regulated single-phase rental.
- Supplier Octopus Energy España; tariff kind periods; reporting month 2026-09; `exc=0` shows no self-consumption warning.

## Acceptance checks

- The worked example produces the bill, profile and tariff above, with a reconciled breakdown.
- `&amp;` separators, mixed-case keys and reordered parameters parse identically.
- Canary Islands and non-N invoices are rejected; PVPC, indexed, G and H invoices record a bill but create no tariff.
- Any non-zero `dto`, `exc`, `impOtrosConIE` or `ajuste` produces a bill without a breakdown.
- A meter amount that matches no regulated rental leaves meter rental empty with a warning.
- Each tariff role case preselects as described; a price change cannot be saved without a date.
- Unticked choices save nothing; no invoice data leaves the browser.

## Design completion

No open product decisions remain. No stored fields change, and every choice is reversible, so no ADR is needed.
