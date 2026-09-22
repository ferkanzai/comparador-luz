# 02 — Add historical tariff periods directly

**What to build:** Let a household backfill an actual previous contract directly in Mis tarifas by entering its prices and the period during which it applied. Make incomplete historical coverage possible without inventing records or corrupting existing history.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Implementation:** complete

- [x] Provide direct historical-tariff creation in Mis tarifas, including tariff name, supplier, supported energy and power prices, optional charges, estimate provenance, and required start/end dates. Preserve all supported tariff terms rather than introducing a reduced historical price model.
- [x] Saving adds an independent historical record and displays its terms and dates in chronological context. It does not designate a current tariff, change the comparison profile, add a candidate offer, or rewrite a bill.
- [x] Require start before end and reject overlaps with recorded historical periods or the current period. Allow gaps. Explain that the end is a change boundary: a tariff ending on 1 June can be followed by one starting on 1 June, with that day belonging to the latter.
- [x] Surface understandable, actionable validation beside the record being entered; do not silently shift other dates or manufacture missing periods.
- [x] Preserve existing zero-length and overlapping legacy records and visibly identify their date inconsistencies. Do not delete, merge, or infer dates from review metadata. An untouched legacy inconsistency must not block unrelated workspace operations or valid additions elsewhere in the timeline.
- [x] Retain historical tariffs' existing use as a source of independent prices when recording older bills. Adding history must not alter snapshots on existing bills.
- [x] New records survive browser reload, account save/read, and existing synchronization/conflict behavior. Preserve existing access policy, candidate offers, current designation, and all existing bill data.
- [x] Verify a backfilled period, a deliberate gap, an adjacent boundary, rejected historical/current overlaps, and rejected zero-length/reversed dates through the UI. Include legacy inconsistent history, saving/reload, keyboard, and phone coverage; run applicable repository checks.

## Comments

The user approved direct history entry with gaps allowed and overlaps prohibited. Shared period-validation behavior should support later slices without requiring a separate broad refactor.

Implementation completed on the current branch. Validation: 80 domain/storage tests and 26 browser workflows passed with disposable local databases and no skips; lint, typechecking, and the production build passed. Triage role is retained separately from implementation completion.

Final review: Standards and Spec reviews cleared after fixing workspace-capacity guards, removing the obsolete current-tariff transition, and consolidating period-correction parameters. Desktop and phone layouts were visually checked; the browser suite includes keyboard and accessibility checks.
