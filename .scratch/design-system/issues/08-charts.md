# 08 — Charts on shadcn Chart

**What to build:** Consider moving the bills and consumption charts from custom SVG to shadcn's `Chart` (Recharts).

**Blocked by:** 07

**Status:** needs-info

**Effort:** M

The user wants to test this on its own, after the screens are done (2026-09-24). Until then the SVG charts stay, styled through `--chart-*` and `--period-*`. Triage should compare accessibility (keyboard month selection, table fallback), bundle size and the stacked/credit bars against the current charts.

## Trial (2026-09-24)

Triaged: try one view first. The bills **Barras** view now draws with Recharts through shadcn `Chart` (`src/components/bills-bars.tsx`): gridlines, a euro Y axis, stacked bars with credits below zero (`stackOffset="sign"`), striped patterns for «Sin desglose» and credits. The month buttons and the detail panel stay laid over it, so keyboard selection and the announced detail are unchanged. It loads through `next/dynamic` with `ssr: false`, so Recharts downloads only when the bars are on screen, never on the comparator.

Evolución and Consumo stay on the SVG for comparison. Waiting on the user's verdict from the preview: move the other two views, or revert and close as wontfix.
