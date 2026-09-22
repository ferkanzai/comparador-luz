# 06 — Remove mistakenly recorded tariffs

**What to build:** Let a household remove an incorrectly entered historical or current tariff record without fabricating replacement history, reactivating a previous contract, or changing saved invoices.

**Blocked by:** 03 — Manage the current tariff and real price changes.

**Status:** ready-for-agent

**Implementation:** complete

- [x] Provide removal actions for recorded current and historical tariffs with confirmation identifying the affected tariff and period. Cancellation leaves all data unchanged.
- [x] Removing a historical period removes only that record and leaves any resulting gap. Never extend, merge, or move neighboring periods.
- [x] Removing the current record leaves no current tariff or current start date. Explain this consequence in the confirmation; do not automatically activate a historical predecessor.
- [x] With no current tariff, the comparator still shows eligible candidate costs but no invented baseline or savings. Mis tarifas offers a way to designate a current tariff again through the established creation flow.
- [x] Keep all saved bills and their tariff snapshots unchanged, along with independent comparison candidates, remaining historical periods, and shared comparison inputs.
- [x] Removing an inconsistent legacy record is possible without first repairing unrelated dates. Do not opportunistically clean up other records.
- [x] Record removal survives reload and existing account synchronization/conflict handling. Preserve existing access policy and do not add a manual whole-workspace save step.
- [x] Verify historical removal between two periods, current removal with historical predecessors present, cancellation, unchanged bills and candidates, no-current comparison behavior, re-designation, and persistence. Include keyboard/phone use and applicable repository checks.

## Comments

The user approved removal with confirmation, leaving gaps and no automatic reactivation. This is record correction functionality, not contract cancellation with the supplier.

Implementation completed on the current branch. Validation: 80 domain/storage tests and 26 browser workflows passed with disposable local databases and no skips; lint, typechecking, and the production build passed. Triage role is retained separately from implementation completion.

Final review: Standards and Spec reviews cleared after fixing workspace-capacity guards, removing the obsolete current-tariff transition, and consolidating period-correction parameters. Desktop and phone layouts were visually checked; the browser suite includes keyboard and accessibility checks.
