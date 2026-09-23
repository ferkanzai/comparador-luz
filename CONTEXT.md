# Luz en claro

Luz en claro helps a household compare manually entered electricity tariffs and understand its recorded bills. Its comparison model covers domestic 2.0TD supplies in Peninsular Spain and the Balearic Islands, with contracted power up to 15 kW; it neither represents the whole market nor switches suppliers.

## Language

### The household's comparison

**Workspace**:
The household's collection of comparison inputs, tariffs, current tariff, price history, and recorded bills. An account holds exactly one. A guest's workspace is kept only in their browser and moves into the account when they sign in. When the same account is used on several devices, each record keeps the last version saved.

**Comparison profile (perfil de consumo)**:
The billing days, consumption by energy period, contracted power by power period, and tax assumptions used to compare tariffs on the same basis. It describes an entered scenario, not necessarily a calendar month or a measured hourly consumption curve.
_Avoid_: User profile, account profile.

**Consumption simulation (simulación de consumo)**:
A temporary variation of the comparison profile's total consumption or distribution across energy periods, used to compare every tariff on the same hypothetical basis. It becomes part of the household's comparison profile only when explicitly adopted; it is not recorded consumption from a bill.

**Supplier (comercializadora)**:
The company offering the tariff or named on the bill; “provider” refers to this same role. It is distinct from the electricity distributor that operates the local network.

**Tariff (tarifa)**:
A named set of pre-tax energy and power prices, optional charges, and offer information entered for a supplier. Prices represent the final contracted rates after applicable contractual discounts.
_Avoid_: Bill, monthly payment.

**Offer (oferta)**:
A manually entered tariff considered as a candidate for comparison, distinct from a recorded period in which the household actually held a contract. Its presence does not establish that it is available to every household or that the app has verified its prices.

**Current tariff (tarifa actual)**:
The tariff the household designates as its current contract and comparison baseline, with the date its current terms began. Selecting it records the household's situation; it does not initiate a supplier switch.
_Avoid_: Cheapest tariff, recommended tariff.

**Tariff period (período de una tarifa)**:
The interval during which the household actually had a particular set of contracted terms, beginning on its start date and ending at its end-date boundary, or remaining open for the current tariff. Recorded periods may leave gaps in the household's known history but do not overlap.

**Offer expiry (validez de la oferta)**:
The optional last date an offer remains eligible for comparison. An expired candidate is excluded from the ranking, while an undated candidate remains eligible and the current tariff remains the baseline even if its offer date has expired.
_Avoid_: Contract end date.

**Tariff history (historial de tarifas)**:
The tariffs and price terms the household actually had during previous dated periods, including periods recorded retrospectively. The end date marks the change, not an additional billable day.
_Avoid_: Bill history, offer archive.

**Tariff correction (corrección de datos de una tarifa)**:
A repair to a recorded tariff's inaccurate information, describing the same actual contract period rather than a new change in contracted prices.

**Tariff price change (cambio de precios de una tarifa)**:
A real change in the household's contracted prices from a specified date, beginning a new period while preserving the previous terms.

**Tariff snapshot**:
An independent copy of tariff terms attached to a history entry or bill. Changes to a comparison candidate do not alter recorded contract periods, and corrections to a current or historical tariff do not alter copies already attached to bills.

### Consumption and prices

**Energy consumption (consumo)**:
The quantity of electricity used over a period, measured in kWh. A recorded zero is known consumption; an unknown quantity is not zero.
_Avoid_: Contracted power, kW consumption.

**Energy periods (períodos de energía)**:
The three consumption categories: P1 punta, P2 llano, and P3 valle. Their kWh sum to the total consumption.

**Contracted power (potencia contratada)**:
The capacity contracted in kW for each of the two power periods: P1 punta and P2 valle. The two capacities can differ; power P2 is not energy P2 llano.
_Avoid_: Energy consumption, kWh capacity.

**Flat energy price (precio las 24 horas)**:
A single €/kWh price applied to total consumption across all energy periods. It is a unit price, not a fixed monthly bill or unlimited consumption allowance.
_Avoid_: Flat monthly fee.

**Energy prices by period (precios por períodos)**:
Separate €/kWh prices applied to consumption in P1 punta, P2 llano, and P3 valle.

**Power price (precio de potencia)**:
A price per contracted kW, quoted per day, month, or year. Two separate period prices, one shared price charged in each period, and one combined price are distinct ways of quoting it.

**Combined power price (precio total de potencia)**:
A single price covering P1 and P2 together, charged once against their equal contracted kW. A shared price charged separately in both periods remains two charges and is not a combined price.

**Comparable power price (precio de potencia para comparar)**:
The pre-tax power price expressed in a common time unit for a reference of 1 kW contracted in each power period: the sum of separate period prices, twice a shared per-period price, or a combined price counted once. It compares equal-power scenarios; it does not describe a household's power charge when its contracted powers differ.

**Effective rate from billed amounts (precio calculado desde importes)**:
A unit price reconstructed from a billed charge and its corresponding consumption, contracted power, and duration. It reproduces the entered amounts rather than recovering an unrounded supplier quote or predicting future prices.

### Charges and tax assumptions

**Energy charge (energía)**:
The monetary cost of consumed kWh at the tariff's energy prices.

**Power charge (potencia)**:
The monetary cost of contracted kW over the billing duration, independent of how much energy was consumed.

**Social-bonus financing (financiación del bono social)**:
A charge funding the social-bonus scheme that may be passed through in the contract. It is distinct from a beneficiary's social-bonus discount and from a tax.
_Avoid_: Social-bonus discount, social tax.

**Meter rental (alquiler de contador)**:
The separate charge for renting the electricity meter over the billing period. An owned meter has no rental charge.

**SNOEE cost (coste SNOEE)**:
The supplier's cost of meeting its obligations under the Sistema Nacional de Obligaciones de Eficiencia Energética, which may be passed through in the electricity price or charged separately. SNOEE names the obligation system; FNEE names the fund through which monetary contributions are made.
_Avoid_: SNOEE tax, universal SNOEE rate.

**Services (servicios)**:
Separate maintenance or ancillary services associated with the tariff. They are distinct from electricity supply and have their own IVA treatment.

**Tax assumptions (impuestos)**:
The chosen supply IVA and electricity-tax (IEE) rates, whether taxes are included in the comparison, and whether the minimum IEE applies. These describe the comparison's assumptions rather than an automatic determination of the legally applicable rates from its dates.

**Estimated charge (cargo estimado)**:
A meter-rental or social-bonus-financing amount the user explicitly adopts from a dated reference instead of an actual contract price. Its estimated origin remains part of saved tariff terms and snapshots.

### Estimates and savings

**Estimated period cost (coste estimado del período)**:
The calculated cost of a tariff under the comparison profile, including its selected charges and tax assumptions. It is an estimate for the entered duration, not a recorded bill or proof of payment.

**Tariff ranking (comparativa de tarifas)**:
The ordering by estimated period cost of entered tariffs with sufficient inputs and eligible offer dates. All candidates use the same comparison profile.

**Estimated savings (ahorro estimado)**:
The reduction in estimated period cost relative to the current tariff under identical comparison inputs. Annualized savings extend that period difference to 365 days with unchanged consumption intensity and prices; they are not a forecast.
_Avoid_: Realized savings, guaranteed annual savings.

**Historical PVPC comparison (comparativa PVPC histórica)**:
A separate estimate using the last complete calendar month's published retail PVPC energy-price averages by period, applied to the entered profile with uniform consumption assumed within each period. It is not an hourly reconstruction of the household's bill, a ranked offer, a future contract, or a bill that can be recorded directly.

### Recorded bills

**Bill (factura)**:
A user-recorded supplier invoice with a reporting month and net amount paid, optionally including billing dates, consumption, charge breakdown, and tariff and profile snapshots. “Invoice” names the same concept here; amounts initially copied from a comparison are draft estimates to check against the actual invoice.
_Avoid_: Calculation result, tariff.

**Billing period (período facturado)**:
The interval between a bill's start and end meter-reading dates, with duration equal to end minus start. It may cross calendar months and is distinct from the month chosen for reporting.

**Reporting month (mes de la factura)**:
The calendar month to which the user assigns the bill's entire amount and recorded consumption. Multiple bills in that month are summed; their values are not apportioned across calendar months from their billing dates.
_Avoid_: Consumption month, billing period.

**Bill breakdown (desglose)**:
The recorded amounts for energy, power, social-bonus financing, SNOEE cost, meter rental, services, IEE, supply IVA, and services IVA. Their sum before credits is the bill's total charges, and their sum minus credits must match the independently entered net amount paid.

**Credit (descuento)**:
A nonnegative amount deducted from the final bill after its recorded charges and taxes, without recalculating those taxes. A discount already reflected in net charge and tax amounts is not another credit to deduct.
_Avoid_: Tax reduction, tariff discount.

**Net amount paid (total pagado)**:
The recorded bill total after credits, which can be negative when the credit exceeds the charges and leaves a balance in the household's favour. It is distinct from the total charges before credits.

**Recorded consumption (consumo facturado)**:
The bill's known total kWh, optionally accompanied by a complete P1/P2/P3 split that sums to that total. “Sin reparto” means a known total without a period split; it does not mean missing consumption.

**Profile snapshot**:
The comparison assumptions captured with a bill, including consumption, power, days, and taxes. The bill's entered dates and recorded consumption are authoritative for interpreting that invoice when they differ from the original comparison scenario.

**Bill reconciliation (cuadre de factura)**:
Agreement between the recorded charge amounts minus the credit and the independently entered net amount paid. Matching a bill total does not establish that its unit prices match a particular tariff.

**Recorded-year comparison (comparación por años)**:
A comparison of paid amounts or consumption across corresponding reporting months in two recorded years. The aggregate difference uses only months with data in both years; consumption additionally requires known kWh for every recorded bill in each included month.
_Avoid_: Annual savings, full-year forecast.

**Consumption coverage (cobertura de consumo)**:
How many recorded bills have known kWh within a reporting month; a month with missing kWh has only a partial known subtotal. Complete coverage describes the entered bills, not proof that every actual household invoice has been recorded.
