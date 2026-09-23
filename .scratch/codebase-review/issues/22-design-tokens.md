# 22 — Design tokens and a type scale in the stylesheet

**What to build:** Define colour, type, spacing and radius tokens in `:root`, and replace the raw values in `src/app/globals.css` with them. Later, optionally, co-locate component styles.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** M for tokens, L to also split the file into per-component CSS Modules

## Why

`globals.css` is one 4,671-line file with 15 custom properties. It contains:

- 182 raw hex colours, many near-duplicates (`#a3342b` and `#a02d28`, `#f2f5ed` and `#f1f4ea`).
- 43 different `font-size` values.
- About 10 different `border-radius` values, although `--radius` exists.

A spacing scale would also fix cases like the phone bill form, where the paragraph "Revisa el importe real de tu factura…" sits directly under the "Fin del período" input with no gap.

The visual design is consistent today (confirmed in the browser pass), but only through discipline. New components have no scale to pick from.

## Checklist

- [ ] Inventory the colours and merge near-duplicates into named tokens (surface, ink, muted, line, accent, danger, the cost categories).
- [ ] Type scale of about 7 steps, spacing scale, and 3–4 radii.
- [ ] Replace values mechanically, section by section. Compare before/after screenshots of every screen on desktop and phone (the browser suite plus `output/review` screenshots).
- [ ] Optional follow-up (L): move component-specific rules into `*.module.css` next to their components.
