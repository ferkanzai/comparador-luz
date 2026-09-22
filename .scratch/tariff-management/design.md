# Tariff management design discussion

All ten interview decisions and the consolidated [specification](./spec.md) were approved by the user, followed by approval of the seven-ticket breakdown and authorization to implement.

## Agreed scope

- Improve Mis tarifas so the household can edit its tariffs and add historical tariff periods directly.
- Do not add charts in this work.
- Include a small comparison that can be shown or hidden, with power prices displayed in a common unit even when entered in different units.
- Make optional offer-date information unobtrusive: collapsed controls with an explanatory message and an “Oferta válida hasta” field, with the entered date visible at a glance in the comparison table.

## Confirmed decisions — round 1

The user accepted all four recommendations:

1. Remove personal review dates and the “He revisado estos precios” action from the interface. Keep optional offer expiry in collapsed offer details. Suggested explanation: “Si la oferta tiene una fecha límite para contratarla, indícala aquí. No es la fecha de fin de tu contrato.” No action is required when the date is blank. This UI decision does not authorize destructive removal of legacy stored dates.
2. The compact historical comparison shows contracted unit prices and charges, including energy, power, and extras, alongside tariff names and active dates. It does not calculate estimated totals. Reuse the existing common power-unit conversion semantics.
3. Separate “Corregir datos”, which repairs an existing record, from “Registrar cambio de precios”, which starts a new dated period and preserves the previous prices. Changing to a different current tariff must also be possible directly from Mis tarifas.
4. Expired candidate offers stay visible but are excluded from ranking, with an explicit “Caducada” label and date. Their expiry can be edited or cleared. Undated candidates remain eligible; current-contract offer expiry never removes the savings baseline.

## Confirmed decisions — round 2

The user accepted all four recommendations:

5. Historical coverage may have gaps, but recorded periods must not overlap. Historical records require start and end dates; the current record requires a start date. The end date is the change boundary, not an additional day: when the next tariff starts on 1 June, its predecessor ends at that same boundary. Explain this beside the date fields.
6. The comparator offers “Registrar como actual” and “Registrar como anterior”, and Mis tarifas supports direct creation. The current tariff supplies the comparator baseline. Former contracts belong in history; “Volver a comparar” explicitly creates a comparison candidate copy whose later edits cannot change the recorded contract period.
7. Correcting a tariff does not update snapshots already attached to recorded bills. Any invoice correction belongs in Mis facturas. Explain this independence when correcting a tariff that may have supplied bill prices.
8. The compact comparison initially selects the current tariff and its most recent predecessor, when available. Allow up to three current/historical records, show the dates for each, and keep comparison selection independent of current-tariff designation.

## Confirmed decisions — round 3

The user accepted both recommendations:

9. Correcting a shared change date can update the predecessor's end and successor's start in one operation. Show both affected periods before saving. Independent date edits remain available for intentional gaps; overlaps are blocked.
10. Allow removal of mistakenly entered historical and current records, with confirmation. Historical removal leaves a gap without extending neighboring periods. Removing the current record leaves no current tariff until the household designates one; never automatically reinstate its predecessor. Saved bills remain unchanged.

## Existing behavior to reconsider

- Current-tariff designation is available through the comparator, while Mis tarifas only exposes current-price editing and historical copies.
- Any save of the current tariff creates a history entry, including corrections unrelated to a real change in contracted prices.
- Personal price review and offer expiry are separate concepts. Personal review stores a date without affecting calculations. Offer expiry excludes candidate offers from ranking but preserves the current tariff as the baseline.
- Historical copies can supply tariff prices when recording an older bill; bills retain independent snapshots.
- The earlier comparison redesign explicitly deferred these model decisions in ../comparison-redesign/spec.md.

## Open decisions

No interview branches remain open. The consolidated design, including the compatibility defaults below, is approved.

## Compatibility defaults for final review

- Preserve existing stored data, including legacy personal-review dates that are no longer displayed. Do not infer real contract changes from those review dates.
- Older history may contain zero-length periods or overlapping dates created under the earlier model. Preserve those records and identify date inconsistencies for correction rather than silently deleting, merging, or inventing dates. New records and corrected periods must follow the agreed timeline rules without preventing unrelated workspace use.
- Keep existing account access and saving behavior; this work does not introduce a new access policy or a manual whole-workspace save step.
