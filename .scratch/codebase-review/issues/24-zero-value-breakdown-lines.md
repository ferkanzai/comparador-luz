# 24 — Zero-value lines in cost breakdowns

**What to build:** Decide how breakdowns show charges that are zero, and apply the decision consistently.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Why

In the browser pass with taxes off, the tariff detail dialog and the finalists table list all nine `billLines`. Seven of them show 0,00 € (social financing, SNOEE, meter, services, IEE, supply IVA, services IVA). On a phone that's a screenful of zeros before the total. In the finalists table, rows where every finalist is zero add no information.

## Open question

Hide zero lines (optionally with "Otros cargos: 0,00 €" collapsed), or keep every line visible for transparency? The latter matches "sin letra pequeña", but costs readability.

## Checklist (after the decision)

- [ ] Apply the rule in `TariffDetails`, `FinalistComparison`, the tariff form preview and the PVPC breakdown.
- [ ] Never hide a line in bill reconciliation (the bill form), where zero is a recorded value.

## Comments

Decision (user, 2026-09-23): hide zero lines in estimates. In the finalists table, hide a row only when it's zero for every finalist. Recorded bills and the bill form keep every line.
