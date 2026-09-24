# 02 — Tailwind v4 and shadcn, with no visible change

**What to build:** Install Tailwind v4 and initialize shadcn (`radix-nova`), keeping every screen identical.

**Blocked by:** 01

**Status:** completed

**Effort:** M

## Checklist

- [x] Tailwind v4 through `@tailwindcss/postcss`; `shadcn init` writes `components.json`, `src/lib/utils.ts` (`cn`) and its tokens in `globals.css`.
- [x] Layer order `theme, base, legacy, components, utilities`; the existing CSS moved into `@layer legacy`.
- [x] Wherever Tailwind's reset changes something the old CSS relied on (heading margins, lists, buttons, tables), restore it in `legacy` so the screenshots match.
- [x] `pnpm test:visual` passes against the 01 baselines; `pnpm test:browser`, typecheck, lint and build pass.

## Comments

Implemented (2026-09-23):

- Tailwind v4 (`@tailwindcss/postcss`), and shadcn with `--base radix --preset nova` (this CLI version names the style `nova`, with `radix` primitives; `components.json` records `radix-nova`). Icons stay `lucide`.
- `init` needed three corrections: it overwrote the app's own `--muted` (a text colour) and `--radius`, merged its dark theme into the app's existing `.dark` class, added Geist to the layout, and pointed `cn` at an unrelated npm package. `globals.css` was assembled by hand instead: shadcn's neutral tokens (the palette comes in 03), no dark theme, the `dark:` variant moved to `.theme-dark`, and Manrope/DM Sans as `--font-heading`/`--font-sans`. The app's variables became `--legacy-muted` and `--legacy-radius` until 03 maps them. `src/lib/utils.ts` has the usual `clsx` + `tailwind-merge` `cn`.
- **How legacy CSS survives Tailwind's reset:** everything outside a shadcn component (they carry `data-slot`) gets `all: revert` at the top of `@layer legacy`, which returns it to the browser defaults the old CSS was written for. The same happens for the reset's form-control pseudo-elements and `::before`/`::after`. SVGs are excluded, because `all: revert` drops their presentation attributes; only their `display` and `vertical-align` are reverted. With that, all 25 screenshots match the baselines exactly.
- A throwaway page (not committed) rendered shadcn's Button variants and Input next to legacy markup: both looked as designed.
- Checks: visual (25 identical), 41 browser tests, 91 unit tests, typecheck, lint, build.
