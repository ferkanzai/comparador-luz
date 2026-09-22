# Comparable power prices on tariff cards

Design agreed after the completed interview. Implemented and verified.

## Agreed direction

- Show a comparable power price prominently on tariff cards, with the original quote always visible underneath.
- Preserve the original quote's unit and distinction between separate period prices, a shared price charged in each period, and a combined price charged once.
- Provide one selector shared by all tariff cards, offering €/kW/día, €/kW/mes, and €/kW/año.
- Use the current tariff's unit initially, or daily when there is no current tariff. Remember explicit selections on this device; a remembered selection takes precedence over the initial default.
- Keep the existing 30-day monthly and 365-day yearly conversions. Explain “Mes = 30 días” alongside the selector or in its explanation.
- Compare rates using 1 kW contracted in each power period as the reference. Power charges add the contracted kW multiplied by each period's rate, without weighting those rates again by hours.
- Label the reference “Referencia: 1 kW en cada período”. Keep it visible for unequal contracted powers, with a visible clarification that the reference rate does not describe that household's power charge. Estimated costs continue to use actual contracted powers; combined quotes remain unavailable for unequal powers.
- Apply the display to every card in “Tus tarifas, frente a frente”, including current, candidate, expired, and incomplete tariffs. History and the separate PVPC panel are outside this change.
- Display comparable rates using Spanish decimal formatting with up to six decimal places, trimming unnecessary trailing zeros. Preserve the original quote's entered precision underneath.
- Show `—` when a required power price is missing. An explicit zero is a valid price. Separate prices require both P1 and P2; shared and combined prices require only their single quoted price.

## Calculation contract

For source-unit duration S and selected-unit duration T, use day = 1, month = 30, year = 365. Comparable price = B × T / S, where B is:

- Separate period prices: P1 + P2.
- A shared price charged in each period: 2 × shared price.
- A combined price: the combined price counted once.

Keep source quotes intact and calculate from unrounded source rates. Changing the selector changes the displayed comparison unit, not saved tariff terms, estimated charges, or ranking.

Examples:

- Separate daily prices 0.08 + 0.02 and a combined daily price of 0.10 both compare as 0.10/day, 3.00/month, or 36.50/year.
- A shared daily price of 0.10 in each period compares as 0.20/day, 6.00/month, or 73.00/year.
- Combined 3.00/month and combined 36.50/year both compare as 0.10/day under the agreed conversion convention.

## Established facts

- Existing power conversions use 30 days per quoted month and 365 days per quoted year (`src/lib/domain.ts`, `powerDayFactor`). This is an app convention, not a verified rule for every supplier's monthly quote.
- Existing calculations reject combined prices when contracted P1 and P2 powers differ.
- Source prices are pre-tax. Missing prices are unknown; explicit zero prices are valid.
- The CNMC illustrates annual power billing as the sum of contracted power times its corresponding period price: https://www.cnmc.es/file/304519/download.

## Acceptance checks

- The calculation examples above agree across all three selected units and all three charging structures.
- Switching the shared selector updates every tariff card while preserving original quote values, precision, units, and charging descriptions.
- Without a remembered selection, the current tariff's unit supplies the default; without a current tariff, the default is daily. Explicit selection survives reload on the same device and takes precedence over the current tariff's unit.
- Missing required power prices display `—`; explicit zero prices display zero. Missing energy prices do not prevent displaying an otherwise complete power reference.
- Unequal contracted powers retain the reference label and clarification. Actual cost calculation still uses the comparison profile, and combined quotes remain unavailable for unequal powers.
- Comparable prices remain pre-tax regardless of the comparison's tax toggle. Unit selection leaves estimated costs, ranking, and saved source prices unchanged.
- History and PVPC retain their existing presentation.

## Design completion

No open product decisions remain from the interview. This is a reversible presentation feature using existing billing conventions; no architectural decision record is needed.

## Implementation and verification

- `src/lib/domain.ts`: reference-price conversion and Spanish formatting; original quote formatting and billing calculations remain unchanged.
- `src/components/dashboard.tsx` and `src/app/globals.css`: shared selector, comparable rates, original quotes, reference labels, and unequal-power clarification on all tariff cards.
- `src/components/use-power-comparison-unit.ts`: device preference with current-tariff/daily fallback, hydration-safe reading, and in-memory selection when storage is unavailable.
- `tests/comparable-power.test.ts`: equivalence across all charging structures and time units, shared versus combined charges, missing versus zero, missing energy, precision, and unchanged actual calculations.
- Validation: 70 tests passed; 2 database integration tests skipped. Type checking, lint, formatting, and production build passed.
- Browser validation covered current-tariff defaults, all unit changes, reload persistence, original precision, unchanged workspace and ranking, missing/zero prices, unequal-power warnings, combined-price exclusion, invalid preference and missing-current fallback, and simulated preference-storage failure. Desktop and mobile screenshots were visually checked; the mobile page has no horizontal overflow.

## Comments

- User requested normalized power prices alongside real/original prices for quick comparison across time units and charging structures.
- User accepted normalized-first prominence and requested a selectable comparison unit, particularly monthly when their offer is quoted monthly.
- User accepted the 30-day month, the reference-price treatment for unequal powers, and a shared day/month/year selector initialized from the current tariff and remembering choices on this device.
- User confirmed scope across all tariff cards, six-decimal formatting with trailing zeros trimmed, preservation of original precision, and the distinction between missing and zero prices, completing the shared design.
- User authorized implementation after reviewing the completed design.
