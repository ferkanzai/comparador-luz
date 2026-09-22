# SNOEE and territorial electricity taxation

Investigated 22 September 2026. Q1–Q5 are resolved; the user confirmed the consolidated scope in `spec.md` and authorized implementation.

## Interview and decision tree

- Q1 resolved: regional expansion is an exploration of broader usefulness, not reported concrete demand or a nationwide product requirement.
- Q2 resolved: manual pre-tax €/kWh entry per tariff, with no reference estimate.
- Q3 resolved: carry the separate charge through comparison, recorded bills, price reconstruction and saved history.
- Q4 resolved: defer territorial expansion and retain explicit Peninsula/Balearics scope.
- Q5 resolved: consolidated scope confirmed, including standard supply-tax treatment and edge cases. The user authorized implementation; the interview frontier is empty.
- Implementation starts only after shared understanding is confirmed. The invoked grilling skill says: “Do not act on it until the user confirms you have reached a shared understanding.” Research and documentation are the current requested work.

## SNOEE findings

SNOEE is a system of supplier energy-efficiency obligations, fulfilled through monetary contributions to FNEE and/or energy-saving certificates (CAE). It is not a separate consumer tax. Source: [MITECO explanation](https://www.miteco.gob.es/es/energia/eficiencia/sistema-nacional-obligaciones-efe.html).

Separate supplier passthrough exists. [Repsol's tariff page](https://www.repsol.es/particulares/hogar/luz-y-gas/tarifas/tarifa-sin-horarios/) had indexed text excluding SNOEE from the headline energy price; its dynamic live page did not consistently expose that block. [Repsol's May 2026 general conditions](https://www.repsol.es/content/dam/images-ecommerce/particulares/hogar/luz-y-gas/documentos/condiciones_generales_contrato_suministro_energia.pdf) identify SNOEE/FNEE among supply costs. [CYE's published conditions](https://intranet.cye-energia.com/docs_public/CCGG_es.pdf) give a historical €/MWh example incorporated in the variable energy price. These establish different price presentations, not a universal customer rate.

Proposed first scope: an optional pre-tax €/kWh price on each tariff, blank meaning no additional charge. Multiply by total consumption and round the resulting line to cents. Keep it when taxes are disabled. Do not infer a charge from the supplier's name or from the mere presence of an informational bill line. Add it only when excluded from the energy prices the user entered.

Suggested label: **Coste SNOEE (€/kWh, sin impuestos)**.

Suggested source-linked explanation:

> Algunas comercializadoras cobran por separado el coste del Sistema Nacional de Obligaciones de Eficiencia Energética (SNOEE). Introduce su precio sin impuestos solo si tu tarifa lo cobra aparte y no está incluido en los precios de energía que has indicado. Si ya está incluido, deja este campo vacío o a 0.

The proposed IEE-base inclusion is an inference from the general treatment of supply consideration, supported by [AEAT's IEE guidance](https://www3.agenciatributaria.gob.es/static_files/Sede/Tema/II_especiales/electricidad/modelo_560/Ayuda_ImpFich2025.pdf), [AEAT's IVA base explanation](https://sede.agenciatributaria.gob.es/Sede/iva/calculo-iva-repercutido-clientes/calculo-base-imponible.html), and the tax-revenue discussion in [MITECO's preparatory memorandum, p. 14](https://www.miteco.gob.es/content/dam/miteco/es/energia/files-1/es-ES/Participacion/Documents/anexos/aeip-om-fnee-2026/20251218_Memoria%20OM_Obligaciones%202026.pdf). No binding ruling specifically addressing separately billed free-market SNOEE was found. Proposed formula: include SNOEE in electricity supply consideration before IEE, and include the charge plus IEE in the supply IVA base.

Do not add a SNOEE reference charge to the existing PVPC energy price: [Orden TED/133/2026, fourth provision](https://boe.es/buscar/doc.php?id=BOE-A-2026-4522) incorporates RFE into variable commercialization. That regulated component is not a universal extra fee for free-market offers.

## Territorial findings and limits

IVA applies in Peninsula/Balearics, excluding Canarias, Ceuta and Melilla: [AEAT territorial scope](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-02-introduccion/territorio-que-se-aplica-impuesto.html). [IEE applies throughout Spain](https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-especial-sobre-electricidad/informacion-general/ambito-territorial.html); a region selector must not disable it.

| Territory | Evidence | Outstanding implementation checks |
| --- | --- | --- |
| Canarias | Residential electricity supplied to individuals at their home with contracted power ≤10 kW has 0% IGIC; other electricity generally 3%. | Power eligibility across two contracted periods, current component treatment, ancillary services and historical rules. |
| Ceuta | Published ordinance specifies 1% IPSI on electricity consumption. | Consolidate subsequent amendments; verify access, rental, services and taxable bases. Do not treat the 2019 ordinance alone as a complete current specification. |
| Melilla | City guidance updated January 2026 lists 1% electricity IPSI and a separate 4% general services rate. | Classify rental and each ancillary component; confirm taxable bases and historical rules. |

Sources: [Canary consolidated tax law, arts. 32–34](https://www.gobiernodecanarias.org/boc/2025/207/3598.html); [Las Palmas municipal guide](https://lpgcsostenible.laspalmasgc.es/wp-content/uploads/2022/07/MANUAL-DE-ENERGIA-Y-CONSEJOS-PARA-SU-AHORRO.pdf), which explicitly gives 7% for meter rental but is older guidance requiring current ATC verification before implementation; [Ceuta ordinance, art. 33](https://www.ceuta.es/ceuta/component/jdownloads/finish/1583-enero/9410-bocce-extra2-30-01-2019?Itemid=534) and [amendment index](https://www.ceuta.es/ceuta/normativa-cac); [Melilla rates](https://www.melilla.es/melillaPortal/contenedor.jsp?codMenu=338&codMenuPN=601&codMenuSN=1&codMenuTN=182&codbusqueda=227&language=es&layout=contenedor.jsp&seccion=s_fdes_d4_v1.jsp).

Tax dates remain separate from territory. [AEAT's 2026 measures](https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-especial-sobre-electricidad/medidas-tributarias-combatir-crisis-energetica-medio.html) confirm ordinary 5.11269632% IEE in August/September 2026 after the temporary reduction's condition was not met. This investigation is not an exhaustive historical tax engine specification.

Product benefit is an inference: accurate regional totals matter even where ranking does not change. Illustratively, 21% instead of 0% adds €21 to a €100 indirect-tax electricity base. If every offer is multiplied by the same positive factor, ranking stays the same; component-specific treatment, different services, tax floors and rounding prevent a blanket invariance claim. We have no adoption or audience evidence with which to quantify commercial gain.

## Code scope and effort

SNOEE is a bounded but medium-sized end-to-end addition:

- `src/lib/domain.ts`: optional tariff price, backwards-compatible bill amount.
- `src/lib/calculator.ts`: separate charge and appropriate tax bases.
- `src/components/tariff-form.tsx`: optional input and source-linked explanation.
- `src/components/dashboard.tsx`, `src/lib/bill-data.ts`, `src/components/bill-form.tsx`: result and bill lines, copying and chart grouping.
- `src/components/invoice-prices.tsx`: effective price from billed SNOEE amount divided by total consumption, if this workflow is included; zero consumption needs explicit handling.
- `src/lib/workspace-records.ts`, SQL migration and `src/lib/workspace-migrations.ts`: live tariffs, snapshots and bill breakdowns. Both existing relational databases and legacy-import paths need the new columns before data import.
- Preserve old totals with a zero additional charge; preserve frozen historical snapshots and account/browser round trips. Existing calculator, bill, draft and storage tests provide appropriate coverage locations.

Territorial support has wider scope:

- The calculator combines electricity, IEE and meter rental into one IVA base and fixes services IVA at 21%; rates alone cannot express component differences.
- Profiles and bill profile snapshots need territorial meaning and compatible defaults for existing data.
- IVA labels and semantics appear across results, recorded breakdowns, SQL and methodology.
- `src/lib/pvpc.ts` reads `PCB`/`TEUPCB`; Ceuta/Melilla feeds and period handling require validation or an explicitly unsupported PVPC panel for those territories.
- `CONTEXT.md`, `docs/CALCULATIONS.md`, profile help and methodology explicitly limit scope to Peninsula/Balearics.

Accepted direction: prioritize SNOEE; defer territorial expansion. Demand and representative invoices are suggested triggers for revisiting it. If pursued, ask for supply location and model the relevant bill components, rather than presenting a universal tax percentage as full territorial support.

No ADR: adding an optional charge and deferring expansion are reversible product scope decisions. Record them here and in the spec; no new architectural commitment warrants an ADR.
