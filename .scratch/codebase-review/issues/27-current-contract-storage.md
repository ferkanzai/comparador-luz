# 27 — Record why the current contract lives in the offers list (ADR-0001)

**What to build:** Keep the current data model, and amend ADR-0001 (or add ADR-0002) to explain why the current contract is stored among the comparator's tariffs, and which code enforces the separation instead.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

**Implementation:** complete

## Why

ADR-0001 separates editable comparison candidates from recorded contract periods. In the data, though, the current contract is one of `workspace.tariffs`, marked by `currentId`. The separation is enforced by UI branching:

- `dashboard.tsx:560`: editing the current tariff routes to the correction form instead of the offer form.
- `dashboard.tsx:93-95` and `comparison-table.tsx:288`: the current tariff can't be deleted as an offer.
- `recordCurrent` (`tariff-periods.ts:108-111`) gives the new current tariff a fresh id. Any finalist selection pointing at it is silently dropped (`comparison-workspace.tsx:76-78`).
- `removePeriod` for the current record also removes it from the offers (`tariff-periods.ts:217-223`).

Someone reading the ADR and then the schema would reasonably assume a bug.

## Checklist

- [x] ADR text: the current contract is stored in `tariffs` because it's also the comparison baseline row. The rule "editing it is a correction, not an experiment" is enforced in `tariff-periods.ts` and by the dashboard's routing. Say what would justify revisiting (for example the sync protocol in ticket 28).
- [x] Once ticket 07 lands, point the ADR at `workspace-actions.ts` as the single place enforcing the rule.
- [x] Keep the finalist selection when `recordCurrent` replaces the id: carry the old id over, or map it in `ComparisonWorkspace`. Add a test.

## Comments

Decision (user, 2026-09-23): keep the current model and document it. Separate storage (originally an L-effort data-model change) is not planned.

Done (2026-09-23):

- ADR-0001 gains a "Where the current contract is stored" section. It explains that the current contract is the comparison's baseline row, lists where the "a correction, not an experiment" rule is enforced (`workspace-actions.ts`, `tariff-periods.ts`, dashboard routing, the comparison table), and says the ticket 28 sync protocol would justify revisiting.
- `workspace-actions.ts` is now the real entry point for the rule: `saveTariff` throws if it's given the current contract's id. Before, only the dashboard's routing prevented an offer edit from overwriting the current contract. No caller relied on it.
- Finalist selection: the fresh id from `recordCurrent` stays. Existing tests deliberately assert it, since a real change is a new record. Instead, the new pure `carryFinalists` (`src/lib/finalist-selection.ts`) maps a selection of the promoted offer or the former contract onto the new current contract, removing duplicates. It only applies when `currentId` changes. Otherwise, removed ids are dropped as before. `ComparisonWorkspace` applies it during render whenever `data` changes (React's "adjust state when a prop changes" pattern), so there's no effect and no flash of lost selection.
- Tests: `tests/finalist-selection.test.ts` covers promoting a selected offer, the former contract and the offer collapsing into one finalist, a price change, and a plain removal still dropping the id. `workspace-actions.test.ts` checks the new guard.
- Validation: typecheck, lint, 110 unit tests and 38 browser tests pass.
