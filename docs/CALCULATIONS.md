# Electricity comparison assumptions

Reviewed 21 September 2026. The engine is in `src/lib/calculator.ts`; executable examples are in `tests/calculator.test.ts`.

## Scope

Spanish domestic 2.0TD supply, contracted power at most 15 kW, in Peninsular Spain or the Balearic Islands. Enter pre-tax final contract rates (after any applicable contractual discounts). Both 24-hour flat prices and three energy periods are supported. Two contracted-power periods are always included. Rates may be entered with decimal commas or points.

No PVPC hourly reconstruction, social-bonus beneficiary discount, self-consumption surplus compensation, IGIC, IPSI, promotional expiry scheduling or switching penalties are simulated. These would need separate models. Offers are entered manually; the app never claims to compare the whole market. Expired offers are excluded from the ranking unless they are your current contract; this avoids invalidating the baseline when an old offer's marketing date expires.

## Formula

1. Energy = sum of kWh × €/kWh for P1, P2 and P3. A flat tariff uses total kWh × its sole price.
2. Power = (P1 kW × P1 price + P2 kW × P2 price) × billing days. If prices are in €/kW/year, divide by 365.
3. Social-bonus **financing** = contract €/day × billing days. This is a charge, not a tax or a beneficiary discount. If included in the energy/power rates already, leave it zero to avoid duplication. Its inclusion in the electricity-tax base follows DGT V2340-22 and article 97 LIE.
4. IEE base = energy + power + financing. IEE = base × user-selected rate. If enabled, enforce the domestic minimum €1/MWh = €0.001/kWh. Disable that floor only when reproducing a genuinely exempt/non-applicable case; setting the percentage to zero alone does not remove it.
5. Meter rental = €/day × days; excluded from IEE.
6. Supply IVA base = IEE base + IEE + meter rental. Supply IVA = that base × user-selected IVA rate.
7. Separate maintenance services = monthly pre-tax cost × 12 × days / 365. They do not incur IEE, and incur the general 21% IVA independently of a reduced supply IVA rate.
8. Total = energy + power + financing + rental + services + IEE + supply IVA + services IVA.

Each line is rounded to euro cents; suppliers using different rounding rules or monthly prorations may differ by cents. Turning off taxes removes only IEE and both IVA lines, retaining all non-tax costs.

Required quantities and prices must be explicitly entered, including zero where appropriate. Blank inputs never count as free energy or missing power. Optional non-tax charges default to zero. General tax values are applied only by an explicit user action, not prefilled into an anonymous form.

## Tax rates and dates

The general IEE rate is 5.11269632%; general IVA is 21%. AEAT confirms that the conditional 0.5% IEE reduction did not apply in August/September 2026. Temporary reductions occurred in other 2026 periods. The user must choose the rates appropriate to their invoice's tax accrual date; the app deliberately does not infer tax rules from the consumption period or hard-code a forever-current rate.

Tax treatment should be re-reviewed when legislation changes. The method dialog exposes the formulas, scope, review date and sources.

## Historical records and savings

Changing the current tariff or editing its prices preserves a deep snapshot of previous terms. The end date identifies the date of the change (not an extra billable day). Actual monthly bills store the entered paid amount, month, optional kWh and a tariff snapshot; they are never recalculated when tariffs change. Multiple bills can share a month and are summed; missing months remain missing, not zero-cost months.

Savings compare each complete non-expired offer against the designated current tariff with identical consumption and tax settings. Annual savings are an explicit extrapolation: period savings × 365 / period days. This is not a seasonal demand or future-price forecast.

## Sources

- [AEAT: IEE rates and minimums](https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-especial-sobre-electricidad/liquidacion-pago-impuesto/tipo-impositivo.html).
- [AEAT: temporary 2026 IEE measures and August/September outcome](https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-especial-sobre-electricidad/medidas-tributarias-combatir-crisis-energetica-medio.html).
- [BOE: Ley 38/1992, articles 97 and 99](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741).
- [DGT binding consultation V2340-22](https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V2340-22) (the official portal did not render in the research tool; [published reproduction](https://www.iberley.es/resoluciones/resolucion-dgt-vinculante-v2340-22-14-11-2022-1541177)).
- [BOE/CNMC: breakdown of concepts with and without IEE, including meter rental](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-16989).
- [CNMC: understand your bill](https://www.cnmc.es/prensa/entiende-tu-factura-20231002).
- [CNMC: beneficiary social bonus](https://www.cnmc.es/facil-para-ti/que-hace-la-cnmc-para-consumidores/bono-social-electrico).
