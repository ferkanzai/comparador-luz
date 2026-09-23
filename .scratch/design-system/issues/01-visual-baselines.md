# 01 — Screenshot baselines of every screen

**What to build:** A visual regression suite that screenshots every screen and state that matters, so later stages can prove they change nothing or show exactly what they change.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** S

## Checklist

- [ ] `playwright.visual.config.ts` and `pnpm test:visual`, separate from `pnpm test:browser`. Chromium only, fixed clock, animations disabled, fonts loaded.
- [ ] Screens, on desktop and phone: guest empty state; comparison with the fixture (table or cards, profile open, simulation, finalists dialog, tariff form); Mis tarifas; Mis facturas with bills, chart and a bill form; the account page; sign-in; privacy. Signed-in screens seed with `seedWorkspace`.
- [ ] Baselines committed from `main` before any styling change.
