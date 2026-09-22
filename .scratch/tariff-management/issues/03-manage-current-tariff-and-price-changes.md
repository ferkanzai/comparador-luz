# 03 — Manage the current tariff and real price changes

**What to build:** Make Mis tarifas the place to establish or replace the current contract and record genuine price changes. Every real change preserves the former terms as a dated period and immediately updates the comparator's savings baseline.

**Blocked by:** 02 — Add historical tariff periods directly.

**Status:** ready-for-agent

**Implementation:** complete

- [x] Display the current tariff with its start date and provide direct creation when no current tariff exists. Collect its actual start date explicitly rather than silently assuming the date it was entered.
- [x] Allow replacing the current tariff directly from Mis tarifas, including choosing an entered candidate or entering a new tariff, with an explicit effective date.
- [x] Provide “Registrar cambio de precios” for a genuine change in the current contract's terms, even when supplier and tariff name stay the same.
- [x] Replacing the current tariff or registering a price change closes the previous period at the change date, preserves its full terms in history, and starts exactly one new current period at that boundary. Apply the agreed period-validation rules without creating a new zero-length predecessor or silently changing other periods.
- [x] Cancelled or rejected changes leave the current designation, history, candidates, and comparison profile untouched. Completed changes save the predecessor and successor together.
- [x] The new current tariff immediately supplies the comparison baseline. The former current contract belongs in history rather than automatically remaining a candidate offer; preserve unrelated, deliberately entered candidates.
- [x] Current and historical contract records are independent of experimental comparison candidates. Preserve bill snapshots and all tariff details, including price units and estimated-charge provenance.
- [x] Maintain compatibility with existing workspaces, browser drafts, exports, account storage, and synchronization. Do not discard an old live tariff merely because a historical record shares its identity when the old data cannot establish whether it was intentionally retained as a candidate.
- [x] Preserve existing comparator entry points while the dedicated comparator-to-contract flow is completed in ticket 05. Do not introduce a manual whole-workspace save requirement or change access policy.
- [x] Verify initial current designation with a chosen date, supplier replacement, same-name price change, invalid chronology, cancellation, baseline recalculation, independent snapshots, and reload/account persistence. Include legacy data, keyboard/phone use, and applicable repository checks.

## Comments

The user approved current-contract management as a separate operation from correcting mistaken data. Ticket 04 supplies the correction workflow; ticket 05 completes explicit transfers between comparator candidates and contract records.

Implementation completed on the current branch. Validation: 80 domain/storage tests and 26 browser workflows passed with disposable local databases and no skips; lint, typechecking, and the production build passed. Triage role is retained separately from implementation completion.

Final review: Standards and Spec reviews cleared after fixing workspace-capacity guards, removing the obsolete current-tariff transition, and consolidating period-correction parameters. Desktop and phone layouts were visually checked; the browser suite includes keyboard and accessibility checks.
