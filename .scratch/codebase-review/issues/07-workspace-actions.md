# 07 — Move workspace changes into tested actions (fixes the 101st-tariff bug)

**What to build:** A `src/lib/workspace-actions.ts` module of pure functions for every workspace change the UI makes, following the pattern of `src/lib/tariff-periods.ts`. Components call these instead of building new workspaces with inline object spreads.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** M

**Implementation:** complete

## Why

`tariff-periods.ts` is the good pattern: pure functions that validate before returning a new workspace (`validateChanges`). Other changes are written inline in components:

- `dashboard.tsx:101-123` saves a tariff, including making it current.
- `dashboard.tsx:527-532` removes a tariff.
- `dashboard.tsx:548-552` adds a bill (appends).
- `bills.tsx:336-339` deletes a bill. `bills.tsx:360-364` saves a bill by filtering and appending, so it behaves differently from the dashboard path.
- `comparison-workspace.tsx:192` adopts a simulation. `dashboard.tsx:389` updates the profile.

**Bug:** adding or duplicating a tariff never checks the 100-tariff limit (`domain.ts:163`). The 101st tariff makes the whole workspace fail validation. Sync then stops permanently with "completa los datos para sincronizar", and nothing tells the user why. `comparePeriod` and `bill-form.tsx:383` do check the limit. The comparator's "Añadir tarifa" and "Duplicar" don't.

## Checklist

- [x] Add `saveTariff`, `removeTariff`, `duplicateTariff`, `saveBill` (insert or replace by id, one behaviour for both callers), `removeBill`, `updateProfile` and `adoptSimulation` as pure functions.
- [x] Reuse `validateChanges` for capacity checks, and throw the same Spanish messages it uses.
- [x] Disable "Añadir tarifa" and "Duplicar" at 100 tariffs with an explanation, as the bill form does.
- [x] Components only call actions and `update()`. No `{ ...w, tariffs: … }` spreads remain in `src/components`.
- [x] Unit tests for each action, including the capacity limit and saving an existing bill from both entry points.
- [x] Browser suite passes.

## Comments

Implemented in `src/lib/workspace-actions.ts`. The dashboard, `Bills` and `ComparisonWorkspace` now only call actions. `ComparisonWorkspace` takes an `onChange(workspace)` prop instead of `onProfile`, so adopting a simulation and editing the profile both go through actions. The only spread left in `src/components` builds the JSON export, which doesn't change the workspace.

Decisions:

- **List limits in one place.** `workspaceLimits` in `domain.ts` now feeds both the schema and `validateChanges`, which is exported from `tariff-periods.ts`. `validateChanges` also checks the 1200-bill limit, because adding a bill never checked it and hitting it would have failed sync the same way the tariff bug did.
- **`duplicateTariff` returns a draft.** Duplicating opens the tariff form with a copy, and the copy is only added when saved through `saveTariff`. So the capacity check happens on save, and the buttons are disabled up front.
- **`saveBill` replaces in place.** Editing a bill used to move it to the end of the list (Mis facturas) or append a second copy (dashboard). Now both keep its position. The list is sorted by month, so what users see doesn't change. The invoice tariff is only added if it isn't already in the workspace.
- **`removeTariff` on the current contract delegates to `removePeriod`**, so `currentId` and `currentSince` are cleared together.
- **"Añadir tarifa", "Duplicar" and the bill form's "Crear tarifa con estos precios"** are disabled at 100 tariffs. Each shows `tariffLimitMessage` and links it through `aria-describedby`. "Volver a comparar" in Mis tarifas already reported the error from `comparePeriod`.

Tests: `tests/workspace-actions.test.ts` covers every action, including the tariff and bill limits and editing at the limit. A new browser test goes from 99 tariffs to 100 by duplicating, checks both disabled buttons and their descriptions, then deletes one to re-enable adding. Unit tests (103), typecheck, lint and the browser suite (30) pass.
