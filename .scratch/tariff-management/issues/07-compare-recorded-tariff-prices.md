# 07 — Compare up to three recorded tariffs

**What to build:** Add a compact, optional comparison in Mis tarifas so a household can inspect how its recorded energy prices, power prices, and other charges differ across contract periods.

**Blocked by:** 02 — Add historical tariff periods directly.

**Status:** ready-for-agent

**Implementation:** complete

- [x] Add a collapsed-by-default “Comparar precios” section with an accessible show/hide control. It compares recorded current and historical tariffs, not candidate offers.
- [x] On initial selection, use the current tariff and its most recent historical predecessor when available, based on period dates rather than insertion order. Do not invent missing records or force deselected defaults back into the selection.
- [x] Let the household select up to three current/historical records. Display tariff names, suppliers, and active dates so repeated names with different terms remain distinguishable.
- [x] Show contracted energy prices, power prices, and optional charges with their units and estimated-charge provenance. Distinguish unknown values from recorded zeroes.
- [x] Reuse the existing day/month/year power display-unit selector and normalization semantics. Support separate-period, shared-per-period, and combined quotes; label the common reference of 1 kW in each period so normalized unit prices are not mistaken for the household's power charge.
- [x] Keep original quote values and units stored unchanged. Comparison selection, expanding/collapsing, and changing display units never edit records, change the comparison profile, designate a current tariff, or create history.
- [x] Do not add estimated total costs, consumption inputs, charts, or realized-savings claims. Offer expiry never prevents inspection of a recorded contract's prices.
- [x] Handle zero, one, and many available records, no current tariff, legacy incomplete data, and records replaced or removed by workspace updates without showing stale selections or prices.
- [x] Verify mathematically equivalent power quotes entered in different units and supported quote structures, repeated names with distinct periods, selection limits, and absence of record mutations. Check keyboard access and phone layout with three selections and run applicable repository checks.

## Comments

The user approved a price-only comparison, initially current plus latest predecessor, with up to three selected records. It can be delivered after direct history entry without waiting for current-tariff management, correction, copying, or removal controls; data-update handling must still be robust.

Implementation completed on the current branch. Validation: 80 domain/storage tests and 26 browser workflows passed with disposable local databases and no skips; lint, typechecking, and the production build passed. Triage role is retained separately from implementation completion.

Final review: Standards and Spec reviews cleared after fixing workspace-capacity guards, removing the obsolete current-tariff transition, and consolidating period-correction parameters. Desktop and phone layouts were visually checked; the browser suite includes keyboard and accessibility checks.
