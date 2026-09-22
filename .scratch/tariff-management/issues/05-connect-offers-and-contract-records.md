# 05 — Connect comparison offers with contract records

**What to build:** Let a household deliberately record a compared offer as an actual current or previous contract, and bring recorded terms back into the comparator as an independent candidate for experimentation.

**Blocked by:** 03 — Manage the current tariff and real price changes.

**Status:** ready-for-agent

**Implementation:** complete

- [x] Add “Registrar como actual” and “Registrar como anterior” to comparison candidates. Collect the current start date or historical start/end dates and reuse the established contract-period rules and saving behavior.
- [x] Registering a current contract updates the baseline and preserves the previous current period. Registering a historical contract does not change the current designation, comparison profile, or recorded bills.
- [x] Explain that these actions record the household's actual contract history; they do not contact suppliers or switch service. Do not imply that candidate offers were unsaved until this action, since candidates already persist automatically.
- [x] Add “Volver a comparar” to recorded current and historical tariffs. Create an independent candidate with the recorded terms, supported quote units, optional charges, estimate provenance, and offer information, without changing contract-period dates or current designation.
- [x] Editing or removing the candidate copy cannot change its source contract period or any bill snapshot. Recording a candidate as a contract must likewise protect the contract from subsequent candidate edits.
- [x] Preserve the offer-expiry rule when copying offer information: expired candidates remain visible but unranked until their expiry is edited or cleared, while the current contract remains the baseline.
- [x] Do not automatically put former contracts back among offers. Preserve unrelated candidates and handle legacy ambiguity without discarding user data by inference.
- [x] Cancellation and validation failure produce no partial contract/candidate transfers. Completed actions survive reload and existing account synchronization/conflict handling, with no new access policy or manual workspace save step.
- [x] Verify offer-to-current, offer-to-history, and current/history-to-candidate workflows, including invalid overlaps, expired terms, independent edits/removals, unchanged bill snapshots, cancellation, and persistence. Include keyboard/phone interaction and applicable repository checks.

## Comments

The user approved explicit transfers between comparison candidates and actual contracted periods. This ticket depends on the recording lifecycle, not on correction, deletion, or the compact comparison UI.

Implementation completed on the current branch. Validation: 79 domain/storage tests and 26 browser workflows passed with disposable local databases and no skips; lint, typechecking, and the production build passed. Triage role is retained separately from implementation completion.
