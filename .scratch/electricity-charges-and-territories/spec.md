# Optional separately billed SNOEE cost

Status: implemented and verified locally, following the user's final scope confirmation.

## Problem and accepted scope

Some suppliers quote an energy price excluding a separately passed-through SNOEE cost. Comparing that price alone understates the tariff's cost. The household must be able to enter this separate charge without duplicating a cost already included in its energy prices.

User decisions: manual entry only; include the charge throughout comparison, recorded bills, effective-price reconstruction and saved history; defer territorial tax support. Existing geographic scope remains domestic 2.0TD in Peninsula/Balearics.

## Accepted behavior

- Add an optional **Coste SNOEE (€/kWh, sin impuestos)** price to each tariff's optional charges. Accept nonnegative values and decimal comma or point. Blank or zero means no additional charge. No supplier detection or suggested reference price.
- Keep a short, visible warning against double counting, with a “¿Qué es?” explanation linking to [MITECO](https://www.miteco.gob.es/es/energia/eficiencia/sistema-nacional-obligaciones-efe.html). Explain that this is a supplier cost, not a consumer tax; use it only when excluded from the entered energy prices.
- Compute the separate amount as total P1+P2+P3 consumption multiplied by the entered price, rounded once to cents, for both flat and period energy tariffs. Zero consumption produces zero calculated SNOEE.
- Include the charge in the IEE base and subsequently the supply IVA base, following the general treatment of electricity supply costs. It remains included when taxes are switched off. Do not add a separate SNOEE tax-exclusion switch. This is a proposed application of general rules, not a claim that a SNOEE-specific binding ruling was found; see the evidence and limitation in `research.md`.
- Display a separate amount in cost breakdowns; allow actual recorded invoice amounts to be edited independently. Include it in reconciliation, comparator-to-bill drafts and the existing other-charges chart category.
- In “Calcular precios desde los importes,” derive the effective price as the entered pre-tax SNOEE amount divided by known positive total consumption. Blank means do not change this price. Missing or zero consumption prevents deriving a price and produces an actionable explanation; it does not silently invent a rate. Recording an actual invoice amount remains possible independently of this derivation.
- Preserve the price and amounts through account saves, browser drafts, history, tariff and bill snapshots, and JSON export. Older data has no additional SNOEE charge; existing historical totals remain unchanged. Changing a live tariff does not rewrite saved history or invoices.
- Add no extra SNOEE charge to the historical PVPC calculation: its published energy price already includes the applicable regulated contribution.

Suggested helper copy:

> Algunas comercializadoras cobran por separado el coste del Sistema Nacional de Obligaciones de Eficiencia Energética (SNOEE). Introduce su precio sin impuestos solo si tu tarifa lo cobra aparte y no está incluido en los precios de energía que has indicado. Si ya está incluido, deja este campo vacío o a 0.

## Boundaries

Only a consumption-based price in €/kWh is entered directly. No new fixed-fee, per-period SNOEE rate, €/MWh selector, automatic estimate or rate lookup is included. The existing billed-amount workflow can reconstruct an effective €/kWh price for a known period; that does not establish the supplier's future pricing structure.

No territory selector, IGIC/IPSI support, regional PVPC expansion or historical tax-rule engine. No architectural refactor is required merely to prepare for these deferred features.

## Implementation and verification

Use the affected files and migration cautions listed in `research.md`. Extend both relational-upgrade and legacy-import migration paths; ensure the destination columns exist before importing data. Preserve the existing optional-charge and snapshot conventions.

Verify zero/default compatibility, flat and period consumption totals, cent rounding, tax-base inclusion, tax-off behavior, bill reconciliation, derivation with positive/zero/missing consumption, saved snapshots, exports, browser drafts and account round trips. Ensure PVPC is not charged twice. Update calculation documentation and help alongside implementation.

An illustrative acceptance case uses 250 kWh and a manually entered 0.003 €/kWh: SNOEE is €0.75 before taxes. This is test data, not a suggested supplier price.

## Verification completed

- `pnpm lint`, `pnpm typecheck`, and `pnpm build` passed.
- `pnpm test`: 64 passed, two optional database suites skipped without their environment variables.
- Ran `tests/workspace-storage.test.ts` separately against a disposable local PostgreSQL 17 database: passed, including legacy import, fresh install, repeated migrations, upgrading an existing relational deployment and preserving SNOEE prices/amounts in snapshots.
- Browser checks at desktop and mobile widths: source-linked help, decimal-comma entry, separate result line, billed-amount reconstruction, missing-consumption error and standard tax totals.
- No production migration or deployment performed. `003-snoee-cost` is wired into the existing deployment migration runner.
