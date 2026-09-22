# 04 — Correct tariff records and shared change dates

**What to build:** Let a household repair current or historical tariff information without claiming a real contract change. When correcting the date of an actual switch, preview and update both adjoining period boundaries in one save.

**Blocked by:** 03 — Manage the current tariff and real price changes.

**Status:** ready-for-agent

**Implementation:** complete

- [x] Provide “Corregir datos” for current and historical tariff records. Correct names, suppliers, prices, charges, notes, or dates in the same recorded period without appending spurious history or resetting an unchanged start date.
- [x] Make correction and “Registrar cambio de precios” distinct actions. Existing edit entry points for recorded contracts must use these meanings consistently; editing a comparison candidate remains an experimental edit.
- [x] A correction to the current tariff updates the actual savings baseline. Corrections do not mutate independent comparison copies, unrelated periods, or the shared consumption profile.
- [x] Support a shared-boundary correction: if A ends and B starts on 1 June, moving the actual switch to 5 June previews A's new end and B's new start before saving both together.
- [x] Validate both proposed periods against each other and neighboring records. Reject changes that create overlaps or invalid durations; cancellation and validation failure preserve both original records.
- [x] Keep independent date editing available for intentional gaps. Do not silently cascade adjustments into other periods or infer a unique neighbor from ambiguous legacy overlaps.
- [x] Allow repair of inconsistent legacy periods under the agreed timeline rules without requiring unrelated legacy errors to be repaired first. Never silently remove or merge their records.
- [x] Preserve snapshots already attached to bills, including their prices and recorded amounts, and explain that bill corrections belong in Mis facturas. Correcting a historical source must not retroactively rewrite invoices.
- [x] Persist corrections and paired boundary updates through reload and existing account synchronization/conflict handling without saving only half of a boundary correction.
- [x] Verify name-only and price corrections create no new history, current baseline updates, independent gaps, paired previews, conflicts with a third period, cancellation, legacy repair, and unchanged bill/candidate snapshots. Include persistence, keyboard/phone flows, and applicable repository checks.

## Comments

The user explicitly accepted updating both sides of a shared boundary with a preview, while retaining independent editing for gaps and keeping saved bills unchanged.

Implementation completed on the current branch. Validation: 79 domain/storage tests and 26 browser workflows passed with disposable local databases and no skips; lint, typechecking, and the production build passed. Triage role is retained separately from implementation completion.
