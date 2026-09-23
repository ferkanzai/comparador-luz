# 23 — Comparison table scrolling on desktop and phone

**What to build:** Remove nested scrolling from the comparison table. Let it take its natural height on desktop, and use a layout that fits a phone screen without two-direction scrolling.

**Blocked by:** none

**Status:** ready-for-agent

**Effort:** M

## Why (browser pass, 8 tariffs)

- **Desktop 1440×1000:** the table is a fixed-height scroll region. Six of eight tariffs are visible, and "Oferta caducada" and "Por completar" are hidden below an inner scrollbar, while the page itself has plenty of room.
- **Phone 390×844:** the region shows only the tariff name and total columns and about five rows. Energy, power and other charges need horizontal scrolling inside a vertically scrolling box inside the page. The footnote literally says "Desliza dentro de la tabla… ↕ ↔".

- **Mis facturas on a phone (signed-in pass):** the bills table has seven columns and cuts off after "Consumo", so the amounts need horizontal scrolling. The monthly chart shows only January to April at 390 px wide. Apply the same card approach to the bill list, and check that the chart fits or clearly signals that it scrolls.

## Open question

Is the fixed height intentional, for example to keep the header row visible? Options:

1. Natural height with a sticky header row on desktop. On phones, a card per tariff (total, difference, three cost lines, "Ver desglose").
2. Keep the table everywhere, but natural height, with only horizontal scrolling on phones and a sticky first column.

## Checklist (after the decision)

- [ ] Implement the chosen layout, keeping the ranking order, tags, finalist checkboxes and row actions.
- [ ] Keyboard access and screen-reader semantics: a table on desktop, a list of articles for cards.
- [ ] Browser tests on 1440 and 390 widths.

## Comments

Decision (user, 2026-09-23): option 1. Natural height with a sticky header row on desktop, and one card per tariff on phones.
