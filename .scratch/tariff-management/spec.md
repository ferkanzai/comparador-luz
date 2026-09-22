# Manage actual tariff periods and optional offer expiry

Design state: approved by the user. The ten product decisions and the consolidated scope are confirmed in [the interview record](./design.md).

## Problem

Mis tarifas currently displays history generated indirectly by comparator actions. A household cannot freely record previous contracts or choose a new current tariff there, and saving any edit to the current tariff creates a historical period even when correcting a mistake. Personal price-review metadata adds a task without a useful calculation consequence and is easily confused with contract dates and offer expiry.

## Intended behavior

### Mis tarifas

- Show the current tariff and its start date, followed by previous tariff periods with their dates and contracted prices.
- Support direct creation of current and historical records. Historical records require start and end dates; the current record requires a start date.
- Provide “Corregir datos” for repairing an existing record without inventing a price change or a new period.
- Provide “Registrar cambio de precios” for a real dated change in contracted prices. Close the previous period at the change boundary and preserve its terms; start the new current period at that boundary.
- Allow choosing a different current tariff directly from this section, including entry of a new tariff. Replacing an existing current tariff preserves it as a historical period.
- Allow removing a mistakenly entered historical or current record after confirmation. Removing history leaves a gap; removing the current record removes the baseline until another current tariff is designated. Neither operation extends neighboring periods or reactivates a predecessor.

### Timeline rules

- The history represents actual contracted periods, with at most one current record.
- Gaps are allowed because recorded history may be incomplete. New and corrected periods must not overlap.
- A historical end date is an exclusive change boundary. If B starts on 1 June, A can end at that same boundary; 1 June belongs to B. Explain this beside the date inputs.
- New historical periods must have a start before their end. Handle legacy zero-length records through the compatibility policy below.
- Correcting a shared change boundary can move both the previous period's end and the following period's start together. Preview both affected periods before one save, and validate the result against other periods.
- Keep independent date correction available when the household intentionally wants a gap. Do not silently move other records to resolve overlaps.

### Comparator and record ownership

- Offer “Registrar como actual” and “Registrar como anterior” from comparison candidates, with the appropriate date inputs.
- The current tariff supplies the comparison baseline. Former contracts belong in history rather than automatically continuing as candidate offers.
- “Volver a comparar” creates an independent comparison candidate from recorded terms. Editing that candidate cannot alter the recorded current or historical period.
- Historical records are directly editable as corrections, but their prices are independent of subsequent candidate edits.
- Correcting or removing a tariff record never rewrites a snapshot already attached to a bill. Invoice corrections remain in Mis facturas. Explain this when correcting tariff records that may have supplied bill prices.
- No-current comparison remains useful: show candidate costs without inventing a savings baseline.

### Compact price comparison

- Add a collapsed-by-default “Comparar precios” section in Mis tarifas, with a show/hide control.
- Initially select the current tariff and its most recent predecessor when available. Do not fabricate missing selections when either is absent.
- Allow selection of up to three current or historical records, with dates displayed to distinguish repeated tariff names.
- Show contracted energy prices, power prices, and optional charges. Do not add estimated period totals, consumption inputs, charts, or realized-savings claims.
- Reuse the existing shared power-unit selector and normalization semantics, including separate-period, shared-per-period, and combined power quotes. Original quote units remain stored; changing the display unit does not change records.
- Label normalized power prices using the existing reference basis so they cannot be mistaken for the household's actual power charge. Preserve the distinction between unknown amounts and entered zeroes, and identify estimated charges.
- Changing comparison selection never designates a current tariff or alters history.

### Optional offer expiry

- Remove personal price-review fields, dates, and actions from the interface, including “Última revisión por ti” and “He revisado estos precios”.
- Keep “Oferta válida hasta” inside a collapsed “Validez y condiciones” section with explanatory copy: “Si la oferta tiene una fecha límite para contratarla, indícala aquí. No es la fecha de fin de tu contrato.”
- The date is optional. No missing-date warning, review request, or extra action is required when blank.
- Show supplied expiry dates at a glance in the main comparison table. Expired candidates display “Caducada” with their date and remain visible but excluded from ranking.
- Allow editing or clearing expiry. Undated candidates remain eligible; offer expiry never removes the current tariff as the savings baseline.
- Offer expiry never determines a historical contract period's dates or whether its prices can be inspected in Mis tarifas.

## Compatibility and scope

- Preserve stored data, including legacy personal-review metadata hidden from the UI. Do not use review dates to invent contract dates, and do not destructively purge those fields as part of this work.
- Preserve legacy zero-length or overlapping history records and flag date inconsistencies for correction. Do not silently merge, delete, or invent dates. Enforce the new rules on new and corrected periods without blocking unrelated workspace use because of an untouched legacy record.
- Preserve independent bill snapshots, existing account access, browser persistence, account synchronization, and conflict handling. Do not add a manual whole-workspace save step.
- Translate the existing live-tariff/current/history representation carefully: preserve entered candidate offers, historical terms, and bill snapshots. Where old records do not establish whether a live tariff was intentionally retained as a candidate, do not discard it by inference.
- No charts, bill-analytics redesign, supplier-price fetching, supplier switching, reminders, or changes to pricing formulas, taxes, or historical PVPC methodology.
- Technical storage and component choices remain implementation work; the ownership and timeline rules above are the product contract.

## Validation

Use user-visible workflows and targeted domain/storage checks for the consequential behavior:

1. Add a current tariff and backfill historical periods with a deliberate gap; reject an overlap and explain the date boundary.
2. Correct names, prices, and dates without creating spurious history. Register a real price change and preserve the predecessor's prices and dates.
3. Replace the current tariff from Mis tarifas and from a comparator candidate. Confirm the new baseline and archived predecessor.
4. Correct a shared change date with a preview of both periods; persist both changes together and reject conflicts with a third period.
5. Remove historical/current records with confirmation, preserving gaps and existing bills and avoiding automatic reactivation.
6. Copy historical terms back into comparison and edit the candidate; verify contract history and existing bill snapshots remain unchanged.
7. Expand the compact comparison, change its selection and power units, and verify source prices and current designation are unchanged. Cover equivalent quotes expressed in different units and the supported power quote structures.
8. Check blank, future, and expired offer dates, including an expired current tariff. Confirm review controls are absent and expiry remains visible in the table when supplied.
9. Reload and synchronize edited records; exercise legacy zero-length/overlapping history without data loss or unrelated-operation failures.
10. Check keyboard and phone use for the collapsed controls, date correction, tariff actions, and compact comparison. Run the repository's applicable checks once implemented.
