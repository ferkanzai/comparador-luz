# 23 — Comparison table scrolling on desktop and phone

**What to build:** Remove nested scrolling from the comparison table. Let it take its natural height on desktop, and use a layout that fits a phone screen without two-direction scrolling.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** M

**Implementation:** complete

## Why (browser pass, 8 tariffs)

- **Desktop 1440×1000:** the table is a fixed-height scroll region. Six of eight tariffs are visible, and "Oferta caducada" and "Por completar" are hidden below an inner scrollbar, while the page itself has plenty of room.
- **Phone 390×844:** the region shows only the tariff name and total columns and about five rows. Energy, power and other charges need horizontal scrolling inside a vertically scrolling box inside the page. The footnote literally says "Desliza dentro de la tabla… ↕ ↔".

- **Mis facturas on a phone (signed-in pass):** the bills table has seven columns and cuts off after "Consumo", so the amounts need horizontal scrolling. The monthly chart shows only January to April at 390 px wide. Apply the same card approach to the bill list, and check that the chart fits or clearly signals that it scrolls.

## Open question

Is the fixed height intentional, for example to keep the header row visible? Options:

1. Natural height with a sticky header row on desktop. On phones, a card per tariff (total, difference, three cost lines, "Ver desglose").
2. Keep the table everywhere, but natural height, with only horizontal scrolling on phones and a sticky first column.

## Checklist (after the decision)

- [x] Implement the chosen layout, keeping the ranking order, tags, finalist checkboxes and row actions.
- [x] Keyboard access and screen-reader semantics: a table on desktop, a list of articles for cards.
- [x] Browser tests on 1440 and 390 widths.

## Comments

Decision (user, 2026-09-23): option 1. Natural height with a sticky header row on desktop, and one card per tariff on phones.

Done (2026-09-23):

- **Comparison, desktop:**
  - The overview table is no longer a scroll region. Its wrapper (`.comparison-frame`) uses `overflow: clip` for the rounded border, so the existing sticky `thead` now sticks to the page.
  - All eight fixture rows show at natural height.
  - The "Desliza dentro de la tabla… ↕ ↔" footnote is gone.
- **Where the cards start:** 1199 px and below. A sticky header can't coexist with horizontal scrolling, so the table is only shown where it fits: it needs 1110 px, and the container measured 1122 px at a 1200 px viewport and 946 px at 1024. Tablets get the cards in an auto-fill grid (three columns at 1024), phones get one column.
- **Cards:** `ComparisonTable` renders both a `<table>` and an `<ol aria-label="Comparativa de tarifas">` of `<article aria-label={tariff.name}>`, and CSS shows one of them. `display: none` removes the other from the accessibility tree, and there's no hydration mismatch or flash that a JavaScript media query would cause.
  - Each card has the finalist checkbox, provider, name (opens the details), tags, offer validity, and edit and delete actions (no delete for the current contract).
  - It shows the total and the difference, three cost lines (energy, power, other charges and taxes) and "Ver desglose". Cards follow the same ranking order as the table.
  - The row pieces (`TariffIdentity`, `TariffTotal`, `DetailsLink`, `RowActions`) are shared between the two layouts, so they can't drift apart.
- **Bills:** new `src/components/bill-list.tsx` renders the bills table, plus a card list at 760 px and below. Each card has the period, provider, tariff, notes, "Ver conceptos", consumption, total before credits, credits, paid, and the edit and delete actions. The monthly breakdown table inside "Ver desglose mensual en tabla" keeps its horizontal scroll, since it's an opt-in detail.
- **Charts:** new `ChartScroll` wraps both the bills chart and the consumption chart. A `ResizeObserver` shows a visible "Desliza el gráfico para ver todos los meses ↔" only when the chart actually overflows. Before, the only signal was in the region's `aria-label`.
- **Tests:**
  - Replaced the phone test that relied on horizontal scrolling with a cards test at 390 px: ranking order, tags, costs, no delete on the current contract, keyboard selection into the finalists, "Ver desglose", no page overflow, and axe.
  - Replaced the inner-scroll edge test with a 1440 px test: every row shows without inner scroll, and the header sticks at the page top while the last row is in view.
  - Kept the finalists dialog's sticky header test.
  - Added a bills test: cards and the chart hint at 390 px, the table and no hint at 1440 px.
- **Validation:** typecheck, lint, 111 unit tests and 40 browser tests pass. I also checked screenshots at 1440, 1200, 1024 and 390.
