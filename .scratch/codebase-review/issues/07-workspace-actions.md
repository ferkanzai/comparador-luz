# 07 — Move workspace changes into tested actions (fixes the 101st-tariff bug)

**What to build:** A `src/lib/workspace-actions.ts` module of pure functions for every workspace change the UI makes, following the pattern of `src/lib/tariff-periods.ts`. Components call these instead of building new workspaces with inline object spreads.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** M

## Why

`tariff-periods.ts` is the good pattern: pure functions that validate before returning a new workspace (`validateChanges`). Other changes are written inline in components:

- `dashboard.tsx:101-123` saves a tariff, including making it current.
- `dashboard.tsx:527-532` removes a tariff.
- `dashboard.tsx:548-552` adds a bill (appends).
- `bills.tsx:336-339` deletes a bill. `bills.tsx:360-364` saves a bill by filtering and appending, so it behaves differently from the dashboard path.
- `comparison-workspace.tsx:192` adopts a simulation. `dashboard.tsx:389` updates the profile.

**Bug:** adding or duplicating a tariff never checks the 100-tariff limit (`domain.ts:163`). The 101st tariff makes the whole workspace fail validation. Sync then stops permanently with "completa los datos para sincronizar", and nothing tells the user why. `comparePeriod` and `bill-form.tsx:383` do check the limit. The comparator's "Añadir tarifa" and "Duplicar" don't.

## Checklist

- [ ] Add `saveTariff`, `removeTariff`, `duplicateTariff`, `saveBill` (insert or replace by id, one behaviour for both callers), `removeBill`, `updateProfile` and `adoptSimulation` as pure functions.
- [ ] Reuse `validateChanges` for capacity checks, and throw the same Spanish messages it uses.
- [ ] Disable "Añadir tarifa" and "Duplicar" at 100 tariffs with an explanation, as the bill form does.
- [ ] Components only call actions and `update()`. No `{ ...w, tariffs: … }` spreads remain in `src/components`.
- [ ] Unit tests for each action, including the capacity limit and saving an existing bill from both entry points.
- [ ] Browser suite passes.
