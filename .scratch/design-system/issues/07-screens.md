# 07 — Screens one by one, starting with the comparison

**What to build:** Rebuild each screen with Tailwind classes and shadcn components, keeping its layout and content, and delete its rules from the legacy stylesheet.

**Blocked by:** 06

**Status:** ready-for-agent

**Effort:** L

## Order

1. Comparison: profile strip, simulation, comparison table and phone cards, finalists, PVPC panel, sign-up prompts.
2. Mis tarifas: tariff periods, price comparison, record forms.
3. Mis facturas: bill list, year comparison, bill form (charts keep their SVG; see 08).
4. Account and sign-in pages, privacy page.
5. Header, workspace tabs (`Tabs`), footer, page shell.

## Checklist

- [ ] One commit per screen. Each removes that screen's legacy rules and keeps `pnpm test:browser` and `pnpm test:visual` (with refreshed baselines) passing.
- [ ] Layout and content unchanged; only the component look changes (nova, per the spec).
- [ ] Done when `@layer legacy` is empty and removed, along with the `all: revert` reset inside it.
- [ ] Afterwards: triage codebase-review ticket 25 (first-run screen).
