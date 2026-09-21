# Electricity comparison assumptions

Reviewed 21 September 2026. The engine is in `src/lib/calculator.ts`; executable examples are in `tests/calculator.test.ts`.

## Scope

Spanish domestic 2.0TD supply, contracted power at most 15 kW, in Peninsular Spain or the Balearic Islands. Enter pre-tax final contract rates (after any applicable contractual discounts). Both 24-hour flat prices and three energy periods are supported. Power supports two prices, one price applied separately to both periods, or an explicitly combined P1+P2 price. A combined price is charged once and requires equal contracted kW in both periods; different kW require the individual prices. The consumption form can link equal contracted powers. Rates may be entered with decimal commas or points.

No PVPC hourly reconstruction, social-bonus beneficiary discount, self-consumption surplus compensation, IGIC, IPSI, promotional expiry scheduling or switching penalties are simulated. These would need separate models. Offers are entered manually; the app never claims to compare the whole market. Expired offers are excluded from the ranking unless they are your current contract; this avoids invalidating the baseline when an old offer's marketing date expires.

## Formula

1. Energy = sum of kWh × €/kWh for P1, P2 and P3. A flat tariff uses total kWh × its sole price.
2. Power = (P1 kW × P1 price + P2 kW × P2 price) × billing days. If prices are in €/kW/year, divide by 365. For €/kW/month, divide by 30, using a 30-day billing month; supplier-specific proration may differ. The invoice-amount price reconstruction uses the same conversion in reverse. This applies to all three power price modes. A combined total price is charged once: 7.20 €/kW/month × 4 kW = €28.80 for 30 days, or €27.84 for 29 days. A price explicitly charged in each period applies to both powers; the same 7.20 rate with 4 kW in each period costs €55.68 for 29 days. Existing per-period tariffs retain that explicit interpretation; select the total-price mode when the quoted rate already includes both periods.
3. Social-bonus **financing** = contract €/day × billing days. This is a charge, not a tax or a beneficiary discount. If included in the energy/power rates already, leave it zero to avoid duplication. Its default inclusion in the electricity-tax base follows DGT V2340-22 and article 97 LIE. A tariff can explicitly exclude financing from IEE to reproduce the treatment on a particular bill; this is a reconciliation setting, not a statement that the exclusion is the general tax rule. IVA still includes financing.
4. IEE base = energy + power + financing (unless explicitly excluded for this tariff). IEE = base × user-selected rate. If enabled, enforce the domestic minimum €1/MWh = €0.001/kWh. Disable that floor only when reproducing a genuinely exempt/non-applicable case; setting the percentage to zero alone does not remove it.
5. Meter rental = €/day × days; excluded from IEE.
6. Supply IVA base = energy + power + financing + IEE + meter rental. Supply IVA = that base × user-selected IVA rate.
7. Separate maintenance services = monthly pre-tax cost × 12 × days / 365. They do not incur IEE, and incur the general 21% IVA independently of a reduced supply IVA rate.
8. Total = energy + power + financing + rental + services + IEE + supply IVA + services IVA.

Each line is rounded to euro cents; suppliers using different rounding rules or monthly prorations may differ by cents. Turning off taxes removes only IEE and both IVA lines, retaining all non-tax costs.

Required quantities and prices must be explicitly entered, including zero where appropriate. Blank inputs never count as free energy or missing power. Optional non-tax charges default to zero. General tax values are applied only by an explicit user action, not prefilled into an anonymous form.

## Optional charge estimates

Both charges remain blank/zero until the user enters a price or explicitly selects “No lo sé · Usar estimación”. All reference amounts are before taxes.

- **Meter rental:** domestic smart meter reference of €0.81/month (single-phase, initial assumption) or €1.36/month (three-phase). The user can select the meter type after applying the estimate. Convert to €/day using monthly × 12 / 365. An owned meter has no rental; other equipment and billing prorations require the actual invoice. Source: [i-DE, regulated rental under Orden IET/1491/2013](https://www.i-de.es/accesos-gestiones-online/preguntas-frecuentes).
- **Social-bonus financing:** €9.011295/year / 365 from [Orden TED/634/2026](https://www.boe.es/eli/es/o/2026/06/17/ted634), published 25 June 2026, effective 26 June and applicable from settlement 7 of 2026. This is a dated reference, not an automatic date-based billing rule. Free-market passthrough depends on the contract, per [MITECO's FAQ](https://www.miteco.gob.es/es/energia/pobreza-energetica/pe-001/preguntas-frecuentes-bono-social.html). Do not add it if already included in the quoted rates. Earlier periods need their applicable price.

Tariffs persist both the chosen daily price and a versioned estimate identifier. Old workspaces default to no estimate metadata. Editing the corresponding price manually or deriving it from an invoice clears only that charge's estimate marker. Merely confirming an offer's review date does not clear estimates. Saved historical tariffs and bill snapshots retain the assumptions; updating a reference in code must never rewrite saved prices. The form, tariff cards, results and history disclose approximations. A bill draft displays the source tariff's estimate notice and still requires checking actual billed amounts.

## Historical PVPC comparison

The separate PVPC panel fetches the last complete calendar month (Europe/Madrid), on demand, from the public [ESIOS archive 70 JSON endpoint](https://api.esios.ree.es/archives/70/download_json?locale=es&date=2026-08-03). It does not require a configured API key. Server-side daily responses are cached for 24 hours; a successful aggregate response has a one-hour CDN cache. At most four days are requested concurrently, with a 25-second total upstream timeout. Missing, duplicated, malformed, wrong-date or incomplete hourly data fails the comparison rather than producing a misleading cheap result. There is no fallback to an older month or invented price.

`PCB` is the published retail energy price for Península/Canarias/Baleares in €/MWh, converted to €/kWh by dividing by 1,000. It already includes energy peajes, cargos, variable commercialization and the futures adjustment. Do not use `PMHPCB` (wholesale price) or add other energy components again. This app's tax scope still restricts the comparison to Península and Baleares.

`TEUPCB` identifies the actual tariff period using the reviewed 2026 toll+charge values: P1 97.55, P2 29.27 and P3 3.29 €/MWh, rounded as in the ESIOS feed. This handles holidays without guessing from weekday alone. Unrecognized TEU values fail closed pending review. Each day's date and hour identifiers must be complete and unique. Spring's last Sunday has 23 rows (02–03 omitted), autumn's has 25 (ESIOS sequential 00–01 through 24–25 labels); every other day has 24. Regression tests include a trimmed real ESIOS weekday fixture.

We calculate arithmetic means per P1/P2/P3 across all hours of the month, retaining negative prices and full precision, and multiply each mean by the user's corresponding kWh. This assumes uniform consumption **within** each period; it is not their hourly curve or an official profiled bill. We apply those reference prices to the user's entered consumption and billing days, even if these come from another month. The UI names the source month, sample coverage, consultation date, assumptions and tax basis. PVPC does not enter the fixed-offer ranking or annual savings extrapolation and cannot be saved as an actual bill or selected as a future contract. The panel is an on-demand view, not a persisted tariff snapshot.

Regulated power references for 2026 (€/kW/year): P1 = 23.324952 + 4.379461 + 3.113; P2 = 0.443770 + 0.281653. The fixed commercialization margin applies to P1 only. Sources: [CNMC peajes, BOE-A-2025-26348](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26348), [cargos, BOE-A-2025-26705](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26705), and [Junta de Andalucía explanation including commercialization](https://www.consumoresponde.es/art%C3%ADculos/la_facturacion_del_suministro_electrico). Financing uses the June 2026 reference described above. These reviewed terms cover July–December 2026; other months fail closed until their terms are reviewed. Review these constants when regulations change; no automatic inference of new regulated rates is made.

Rental initially assumes a single-phase smart meter (€0.81/month × 12 / 365), with explicit choices for three-phase, owned, the current tariff's rental or a custom daily value. PVPC has no added maintenance services in this estimate. Totals use the same tax engine and user-selected tax rates as entered tariffs. Both power periods must be ≤10 kW; incomplete inputs never produce a zero-cost comparison. This is scoped to households and excludes beneficiary bono social discounts.

An accurate retrospective comparison would additionally need hourly kWh matched to published retail prices, or the appropriate [official consumption profile](https://www.ree.es/es/clientes/consumidor/gestion-medidas-electricas/consulta-perfiles-de-consumo), an explicit consumption date range and the tax rates applicable to the actual invoice. See [REE's PVPC explanation](https://www.ree.es/es/operacion/sistema-electrico/pvpc).

## Tax rates and dates

The general IEE rate is 5.11269632%; general IVA is 21%. AEAT confirms that the conditional 0.5% IEE reduction did not apply in August/September 2026. Temporary reductions occurred in other 2026 periods. The user must choose the rates appropriate to their invoice's tax accrual date; the app deliberately does not infer tax rules from the consumption period or hard-code a forever-current rate.

Tax treatment should be re-reviewed when legislation changes. The method dialog exposes the formulas, scope, review date and sources.

## Historical records and savings

Changing the current tariff or editing its prices preserves a deep snapshot of previous terms. The end date identifies the date of the change (not an extra billable day). Actual bills store the paid amount, optional start/end dates, an editable reporting month (defaulting to the end month), optional kWh, the consumption snapshot when copied from the comparator, an optional itemized cost breakdown and a tariff snapshot; they are never recalculated when tariffs change. Multiple bills can share a month and are summed; missing months remain missing, not zero-cost months.

Savings compare each complete non-expired offer against the designated current tariff with identical consumption and tax settings. Annual savings are an explicit extrapolation: period savings × 365 / period days. This is not a seasonal demand or future-price forecast.

## Sources

- [AEAT: IEE rates and minimums](https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-especial-sobre-electricidad/liquidacion-pago-impuesto/tipo-impositivo.html).
- [AEAT: temporary 2026 IEE measures and August/September outcome](https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-especial-sobre-electricidad/medidas-tributarias-combatir-crisis-energetica-medio.html).
- [BOE: Ley 38/1992, articles 97 and 99](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741).
- [DGT binding consultation V2340-22](https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V2340-22) (the official portal did not render in the research tool; [published reproduction](https://www.iberley.es/resoluciones/resolucion-dgt-vinculante-v2340-22-14-11-2022-1541177)).
- [BOE/CNMC: breakdown of concepts with and without IEE, including meter rental](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-16989).
- [CNMC: understand your bill](https://www.cnmc.es/prensa/entiende-tu-factura-20231002).
- [CNMC: beneficiary social bonus](https://www.cnmc.es/facil-para-ti/que-hace-la-cnmc-para-consumidores/bono-social-electrico).

## Reconciling the reported Octopus invoice

The supplied example has 29 days, 4 kW in both power periods and 10/10/23 kWh. The printed prices yield €26.45: energy €4.94, power €14.38, financing €0.73, rental €0.78, IEE €1.03 and IVA €4.59. The invoice shows €26.35: energy €4.92, power €14.38, financing €0.72, rental €0.77, IEE €0.99 and IVA €4.57.

The displayed unit prices cannot reproduce those invoice line amounts (10 kWh × €0.192 is €1.92, not the billed €1.91). The editor's **Calcular precios desde los importes** derives effective rates from the entered billed amounts and their corresponding consumption/power/days, retaining 12 decimals. These are reconstructed average rates, not recovered supplier precision or predictions of future indexed prices. Peajes and cargos already form part of the line amount and must not be added again.

Using energy amounts €1.91/€1.13/€1.88, power amounts €11.25/€3.13, financing €0.72 and rental €0.77, and explicitly excluding financing from IEE reproduces all seven supplied totals, including €26.35. The €0.99 IEE implies a base of energy + power (€19.30); this is an inference from the supplied amounts, not a finding that the supplier's treatment is legally correct. We do not silently subtract a rounding correction or change the general tax default.

## Bill periods and monthly charts

Bills may span calendar months. Start and end dates follow meter-reading boundaries: days between readings = end minus start. A draft from the comparator suggests today's date as the end and subtracts its billing days for the start; users must check both against their invoice. The separately stored consumption snapshot remains the calculation's original inputs. Old bills can retain unknown dates.

The full paid amount is attributed to the selected reporting month; there is no unsupported allocation of kWh or costs across calendar months. Stacks show energy, power, other charges (financing/rental/services), taxes and legacy totals without a breakdown. Itemized amounts must sum to the paid total. Multiple bills in a month are aggregated and missing months remain missing. A text table presents the same monthly data.

The CNMC confirms that households can contract equal or different powers in the two periods: [CNMC power guidance](https://blog.cnmc.es/2023/06/23/panel-de-hogares-cnmc-por-que-tienes-contratada-mas-potencia-de-la-necesaria/).

## Recorded bill credits

Bills optionally store a positive `credit` amount (zero for older records). It represents a credit applied to the final bill after the recorded taxes. With a breakdown, `paid = sum(line amounts) - credit`; the paid total is entered independently and is never overwritten when the credit or a breakdown line changes. The editor shows the sum, credit, net total and exact difference, and the shared server/client schema rejects mismatches greater than the sub-cent tolerance. Credits larger than the charges can produce a negative total (a balance in the customer's favour). A discount that reduces a taxable charge should instead be reflected in the actual net charge and tax lines, not deducted a second time here.

Charts show gross charge categories above zero and credits below zero. Total-only bills use `paid + credit` as the unknown gross charge. The evolution view shows a separate line for each charge category and the net amount paid, with optional credit and unknown-amount series. Each line can be hidden from the legend. Missing months interrupt every line. Both tables distinguish the total before credits from the net amount paid; the bill list also shows the credit in its own column.

## Multiple prices within one invoice

The editor no longer offers creation of new price lines. Existing lines remain editable under **Opciones avanzadas · tramos guardados**, and the invoice modal keeps the same width throughout.

One invoice remains one record even if the supplier changes a tariff or a regulated charge during its billing period. Optional `priceLines` preserve multiple billed lines **per concept**, with a label (for example P1 or the tariff name), start/end dates, quantity, unit, printed price and actual billed amount. Dates use exclusive end boundaries, consistent with the bill's meter-reading dates. Dates and quantity/price can be omitted when only the billed amounts are available; each pair must otherwise be complete. Supplied dates must lie inside the invoice period. Energy period lines may share a date range, so overlaps are not automatically rejected or interpreted as duplicate usage.

The editor proposes each line amount as `round(quantity × price, 2)`, but permits an explicit correction to match the supplier's billed amount when the printed unit price is rounded. For daily charges there is an explicit “use days in this interval” action. For power the quantity must be kW × days/months/years matching the printed price unit. The app never distributes kWh proportionally across dates or infers a tariff switch from a changed regulated charge.

The sum of the lines updates **only that concept's aggregate**, leaving the independently entered paid total and tax amounts unchanged. Example using the user's rounded prices: 16 days × €0.019 → €0.30, plus 14 days × €0.025 → €0.35, yields €0.65 of financing in the same invoice. Copy the actual invoice's dates, prices and rounded amounts; these example rates are not universal regulatory defaults. Existing energy, power and tax lines use the same aggregate calculation.

Both client and server validate line dates, quantities, identifiers, aggregate sums and the final reconciliation: `sum(concepts) - credit = paid`. Missing or invalid line amounts are incomplete, not zero. Removing all detailed lines retains the concept total; disabling the whole breakdown removes the line details as well. Older bills default to an empty `priceLines` array. Exports, saved bills and account reloads retain the lines; monthly charts still count one invoice and use its aggregate concepts. The single linked tariff snapshot is contextual; actual split billed prices live in `priceLines` and do not alter tariff history.

## Recorded consumption and invoice prices

The third chart view, **Consumo**, shows monthly recorded kWh, with stacks for Punta (P1), Llano (P2), Valle (P3), and total-only invoices (**Sin reparto**). Optional `Bill.consumption` holds all three period values, including explicit zeroes, and their sum becomes `Bill.kwh`. The shared schema rejects incomplete splits and inconsistent totals. Existing comparator snapshots can supply a split only when all three values are known and match the recorded total; explicit `null` opts out of this legacy fallback. Unknown kWh are excluded from sums and shown through coverage counts and partial-month labels; known zero consumption remains a recorded value. Reporting months work exactly like monetary charts, without allocation across invoice dates.

The invoice editor no longer infers tariff identity from a similar bill amount, suggests tariffs by total, or requests an acknowledgement of a mismatch. Small unit-price differences may offset one another or fall below an amount threshold; adding taxes does not establish that prices match. Users should compare the printed unit prices with their saved tariff. Existing `tariffReview` metadata remains readable for backwards compatibility. Exact breakdown reconciliation (including entered taxes and credits) and consumption validation still apply.

Invoice dates override snapshot days and invoice period consumption overrides snapshot consumption when preparing the profile for the price editor. Creating a new tariff from the invoice opens the existing price editor and holds a draft: it is saved atomically with the invoice only if still linked, and does not change the current contract. Canceling the invoice discards that draft.

## Comparing invoice years

Within **Mis facturas**, the **Mes a mes** and **Por años** views share a heading and an **Añadir factura** action. **Por años** is available when saved invoices use at least two distinct reporting years. It compares any two recorded years, defaulting to the latest and its preceding recorded year, with paid-amount and consumption views. Monthly columns aggregate all invoices assigned to that reporting month, including net credits and negative paid totals. Missing months are not plotted as zero; explicit zero values remain known data.

The headline and table footer compare only matching months with data in both years. For consumption, every recorded invoice in each matching month must have kWh; a partial month's known subtotal is displayed with an asterisk and coverage explanation but excluded from the difference. The absolute difference is comparison year minus reference year. A percentage is shown only for a strictly positive reference subtotal. These recorded-month comparisons neither extrapolate a full year nor attribute a change to tariff savings. The app cannot know whether a user has entered every actual invoice.

## Transient feedback

Action confirmations share a dismissible notice. Short success messages expire after 8 seconds; messages longer than 140 characters get 15 seconds. Hover, keyboard focus and a hidden browser tab suspend dismissal; leaving those states grants a fresh reading interval. Every new message, even identical text, restarts its timer. Action errors remain visible until dismissed or superseded; loading errors and persistent form validation retain their existing recovery actions. Closing a notice does not change the underlying save, account or form state.
