# 01 — Make offer expiry optional and visible

**What to build:** Replace the personal price-review flow with unobtrusive, optional offer-expiry information. A household can ignore dates entirely, or enter a contracting deadline and see it at a glance in the comparator.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Implementation:** complete

- [x] Remove personal-review dates, fields, notices, and actions from the user interface, including “Última revisión por ti” and “He revisado estos precios”. Preserve legacy stored review metadata without exposing it or using it as a contract date.
- [x] Place “Oferta válida hasta” in a collapsed-by-default “Validez y condiciones” section. Explain: “Si la oferta tiene una fecha límite para contratarla, indícala aquí. No es la fecha de fin de tu contrato.” Keep offer links and conditions accessible.
- [x] A blank expiry requires no action and produces no missing-date or review warning. Users can enter, change, or clear an expiry date.
- [x] Display supplied expiry dates in the main comparison table. Expired candidates remain visible with “Caducada” and their date, but are excluded from ranking. The date itself remains eligible; expiry applies after it.
- [x] Undated candidates remain eligible, and offer expiry never removes the current tariff as the savings baseline. Preserve existing cost formulas and input-completeness rules.
- [x] Expiry does not define contract-period boundaries or prevent inspection of historical prices.
- [x] Expiry edits survive reload and existing account synchronization, without clearing hidden legacy metadata or changing bill snapshots. Preserve account access and saving behavior.
- [x] Verify blank, future, same-day, and expired dates, including an expired current tariff, through the user-facing flow. Verify the absence of personal-review controls and usable table/date controls on phone and keyboard. Run applicable repository checks.

## Comments

The user approved the complete tariff-management design and this seven-ticket breakdown. This slice can proceed independently of contract-history work.

Implementation completed on the current branch. Validation: 79 domain/storage tests and 26 browser workflows passed with disposable local databases and no skips; lint, typechecking, and the production build passed. Triage role is retained separately from implementation completion.
