# 27 — Record why the current contract lives in the offers list (ADR-0001)

**What to build:** Keep the current data model, and amend ADR-0001 (or add ADR-0002) to explain why the current contract is stored among the comparator's tariffs, and which code enforces the separation instead.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Why

ADR-0001 separates editable comparison candidates from recorded contract periods. In the data, though, the current contract is one of `workspace.tariffs`, marked by `currentId`. The separation is enforced by UI branching:

- `dashboard.tsx:560`: editing the current tariff routes to the correction form instead of the offer form.
- `dashboard.tsx:93-95` and `comparison-table.tsx:288`: the current tariff can't be deleted as an offer.
- `recordCurrent` (`tariff-periods.ts:108-111`) gives the new current tariff a fresh id. Any finalist selection pointing at it is silently dropped (`comparison-workspace.tsx:76-78`).
- `removePeriod` for the current record also removes it from the offers (`tariff-periods.ts:217-223`).

Someone reading the ADR and then the schema would reasonably assume a bug.

## Checklist

- [ ] ADR text: the current contract is stored in `tariffs` because it's also the comparison baseline row. The rule "editing it is a correction, not an experiment" is enforced in `tariff-periods.ts` and by the dashboard's routing. Say what would justify revisiting (for example the sync protocol in ticket 28).
- [ ] Once ticket 07 lands, point the ADR at `workspace-actions.ts` as the single place enforcing the rule.
- [ ] Keep the finalist selection when `recordCurrent` replaces the id: carry the old id over, or map it in `ComparisonWorkspace`. Add a test.

## Comments

Decision (user, 2026-09-23): keep the current model and document it. Separate storage (originally an L-effort data-model change) is not planned.
