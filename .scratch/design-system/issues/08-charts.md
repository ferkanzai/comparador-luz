# 08 — Charts on shadcn Chart

**What to build:** Consider moving the bills and consumption charts from custom SVG to shadcn's `Chart` (Recharts).

**Blocked by:** 07

**Status:** needs-triage

**Effort:** M

The user wants to test this on its own, after the screens are done (2026-09-24). Until then the SVG charts stay, styled through `--chart-*` and `--period-*`. Triage should compare accessibility (keyboard month selection, table fallback), bundle size and the stacked/credit bars against the current charts.
