# 02 — Tailwind v4 and shadcn, with no visible change

**What to build:** Install Tailwind v4 and initialize shadcn (`radix-nova`), keeping every screen identical.

**Blocked by:** 01

**Status:** ready-for-agent

**Effort:** M

## Checklist

- [ ] Tailwind v4 through `@tailwindcss/postcss`; `shadcn init` writes `components.json`, `src/lib/utils.ts` (`cn`) and its tokens in `globals.css`.
- [ ] Layer order `theme, base, legacy, components, utilities`; the existing CSS moved into `@layer legacy`.
- [ ] Wherever Tailwind's reset changes something the old CSS relied on (heading margins, lists, buttons, tables), restore it in `legacy` so the screenshots match.
- [ ] `pnpm test:visual` passes against the 01 baselines; `pnpm test:browser`, typecheck, lint and build pass.
