# Electricity comparison assumptions

Reviewed 21 September 2026. The engine is in `src/lib/calculator.ts`; executable examples are in `tests/calculator.test.ts`.

## Scope

Spanish domestic 2.0TD supply, contracted power at most 15 kW, in Peninsular Spain or the Balearic Islands. Enter pre-tax final contract rates (after any applicable contractual discounts). Both 24-hour flat prices and three energy periods are supported. Power supports two prices, one price applied separately to both periods, or an explicitly combined P1+P2 price. A combined price is charged once and requires equal contracted kW in both periods; different kW require the individual prices. The consumption form can link equal contracted powers. Rates may be entered with decimal commas or points.

No PVPC hourly reconstruction, social-bonus beneficiary discount, self-consumption surplus compensation, IGIC, IPSI, promotional expiry scheduling or switching penalties are simulated. These would need separate models. Offers are entered manually; the app never claims to compare the whole market. Expired offers are excluded from the ranking unless they are your current contract; this avoids invalidating the baseline when an old offer's marketing date expires.

## Formula

1. Energy = sum of kWh × €/kWh for P1, P2 and P3. A flat tariff uses total kWh × its sole price.
2. Power = (P1 kW × P1 price + P2 kW × P2 price) × billing days. If prices are in €/kW/year, divide by 365.
3. Social-bonus **financing** = contract €/day × billing days. This is a charge, not a tax or a beneficiary discount. If included in the energy/power rates already, leave it zero to avoid duplication. Its default inclusion in the electricity-tax base follows DGT V2340-22 and article 97 LIE. A tariff can explicitly exclude financing from IEE to reproduce the treatment on a particular bill; this is a reconciliation setting, not a statement that the exclusion is the general tax rule. IVA still includes financing.
4. IEE base = energy + power + financing (unless explicitly excluded for this tariff). IEE = base × user-selected rate. If enabled, enforce the domestic minimum €1/MWh = €0.001/kWh. Disable that floor only when reproducing a genuinely exempt/non-applicable case; setting the percentage to zero alone does not remove it.
5. Meter rental = €/day × days; excluded from IEE.
6. Supply IVA base = energy + power + financing + IEE + meter rental. Supply IVA = that base × user-selected IVA rate.
7. Separate maintenance services = monthly pre-tax cost × 12 × days / 365. They do not incur IEE, and incur the general 21% IVA independently of a reduced supply IVA rate.
8. Total = energy + power + financing + rental + services + IEE + supply IVA + services IVA.

Each line is rounded to euro cents; suppliers using different rounding rules or monthly prorations may differ by cents. Turning off taxes removes only IEE and both IVA lines, retaining all non-tax costs.

Required quantities and prices must be explicitly entered, including zero where appropriate. Blank inputs never count as free energy or missing power. Optional non-tax charges default to zero. General tax values are applied only by an explicit user action, not prefilled into an anonymous form.

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

Bills optionally store a positive `credit` amount (zero for older records). It represents a credit applied to the final bill after the recorded taxes. With a breakdown, `paid = sum(line amounts) - credit`; changing the credit updates the total without modifying the recorded tax amounts. Credits larger than the charges can produce a negative total (a balance in the customer's favour). A discount that reduces a taxable charge should instead be reflected in the actual net charge and tax lines, not deducted a second time here.

Charts show gross charge categories above zero and credits below zero. Total-only bills use `paid + credit` as the unknown gross charge. The line view uses the net amount paid, and missing months interrupt the line.
