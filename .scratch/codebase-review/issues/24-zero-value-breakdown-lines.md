# 24 — Zero-value lines in cost breakdowns

**What to build:** Decide how breakdowns show charges that are zero, and apply the decision consistently.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

**Implementation:** complete

## Why

In the browser pass with taxes off, the tariff detail dialog and the finalists table list all nine `billLines`. Seven of them show 0,00 € (social financing, SNOEE, meter, services, IEE, supply IVA, services IVA). On a phone that's a screenful of zeros before the total. In the finalists table, rows where every finalist is zero add no information.

## Open question

Hide zero lines (optionally with "Otros cargos: 0,00 €" collapsed), or keep every line visible for transparency? The latter matches "sin letra pequeña", but costs readability.

## Checklist (after the decision)

- [x] Apply the rule in `TariffDetails`, `FinalistComparison`, the tariff form preview and the PVPC breakdown.
- [x] Never hide a line in bill reconciliation (the bill form), where zero is a recorded value.

## Comments

Decision (user, 2026-09-23): hide zero lines in estimates. In the finalists table, hide a row only when it's zero for every finalist. Recorded bills and the bill form keep every line.

Done (2026-09-23):

- New `estimateLines(costs)` in `src/lib/bill-data.ts` returns the `billLines` to show for one or more estimates. An optional charge is kept when any compared cost has a non-zero amount after rounding to cents, so 0,004 € counts as zero. Excluded finalists (`null` cost) don't count.
- Energy and power are always shown. They're the core of every bill, and keeping them avoids an empty breakdown for incomplete estimates.
- Used in `TariffDetails` (`comparison-table.tsx`), `FinalistComparison` (one call over every finalist's cost, so a row is hidden only when it's zero for all of them), the tariff form preview (`tariff-form-sections.tsx`) and the PVPC breakdown.
- Untouched: `bill-form.tsx` and the recorded bill concepts in `bills.tsx` still map over the full `billLines`.
- Tests:
  - `tests/bills.test.ts` covers the helper: all-zero, sub-cent and mixed finalists.
  - A browser test in `comparison.spec.ts` checks the Casa 24h detail hides the meter and services IVA. With Clara Fija as a finalist the meter row is absent; adding Verde Completa brings it back with 0,00 € for Casa 24h.
- Validation: typecheck, lint, 111 unit tests and 39 browser tests pass.
