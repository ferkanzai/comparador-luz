# 01 — Screenshot baselines of every screen

**What to build:** A visual regression suite that screenshots every screen and state that matters, so later stages can prove they change nothing or show exactly what they change.

**Blocked by:** none

**Status:** completed

**Effort:** S

## Checklist

- [x] `playwright.visual.config.ts` and `pnpm test:visual`, separate from `pnpm test:browser`. Chromium only, fixed clock, animations disabled, fonts loaded.
- [x] Screens, on desktop and phone: guest empty state; comparison with the fixture (table or cards, profile open, simulation, finalists dialog, tariff form); Mis tarifas; Mis facturas with bills, chart and a bill form; the account page; sign-in; privacy. Signed-in screens seed with `seedWorkspace`.
- [x] Baselines committed from `main` before any styling change.

## Comments

Implemented (2026-09-23): `playwright.visual.config.ts`, `tests/visual/screens.spec.ts` and 25 baselines in `tests/visual/screens/` (desktop and phone). Covered: guest empty, comparison, profile, simulation, tariff form, finalists (desktop only; phones pick finalists on cards), sign-in, privacy; signed in: comparison, Mis tarifas, Mis facturas, bill form, account page. Dialogs are captured as the visible screen, everything else as the full page. Next's development overlay is hidden in screenshots. Two consecutive runs matched the baselines exactly.

That development overlay exposed a real problem, now fixed on this branch: `readWorkspace` ran three queries in parallel on the transaction's single connection, which pg queues with a deprecation warning and will reject in pg 9.
