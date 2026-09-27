"use client";
import { useId, useState, type ReactNode } from "react";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import {
  shortDate,
  comparablePowerPrice,
  formatPowerPrice,
  powerDescription,
  powerUnitLabels,
  type Tariff,
} from "@/lib/domain";
import { estimatedCharges } from "@/lib/charge-estimates";
import type { TariffPeriod } from "@/lib/tariff-periods";
import CostCategoryLabel, { type CostCategory } from "./cost-category-label";
import { formatTariffPrice as price } from "@/lib/tariff-price-format";
import { usePowerComparisonUnit } from "./use-power-comparison-unit";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const cell =
  "w-[220px] max-w-[240px] min-w-[180px] border-0 border-b border-solid border-border px-5 py-2.5 text-left align-middle tracking-normal whitespace-normal normal-case wrap-anywhere max-[700px]:w-[116px] max-[700px]:min-w-[116px] max-[700px]:px-3";
/* The labels stay put while the prices scroll sideways. */
const firstCell =
  "sticky left-0 z-1 w-[200px] min-w-[200px] bg-background pl-0 max-[700px]:w-[112px] max-[700px]:min-w-[112px] max-[700px]:pl-0 max-[700px]:text-xs/[1.4]";
const headCell = cn(
  cell,
  "bg-card text-xs-plus font-normal text-muted-foreground",
);
const columnHead = cn(
  headCell,
  "border-t-2 border-b-input border-t-foreground py-3 align-top *:block",
);
const rowHead = cn(headCell, firstCell);
const valueCell = (current: boolean) =>
  cn(
    cell,
    "text-lg/[1.4] tabular-nums [tr:last-child>&]:border-b-0",
    current && "bg-accent",
  );
const unitNote = "mt-0.5 ml-1.5 text-2xs max-[700px]:ml-0 max-[700px]:block";
const powerNote = "mt-1.5 block text-2xs leading-[1.5] text-muted-foreground";

export default function TariffPriceComparison({
  periods,
}: {
  periods: TariffPeriod[];
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => {
    const current = periods.find((p) => p.current);
    const previous = periods
      .filter((p) => !p.current)
      .sort((a, b) => b.end.localeCompare(a.end))[0];
    return [current, previous].filter((p) => p !== undefined).map((p) => p.id);
  });
  const selectedIds = selected.filter((id) => periods.some((p) => p.id === id));
  const records = periods.filter((p) => selectedIds.includes(p.id));
  const [unit, setUnit] = usePowerComparisonUnit("day");
  const byPeriod = records.some((p) => p.tariff.kind !== "fixed");
  const row = (
    label: string,
    unitLabel: string,
    render: (tariff: Tariff) => ReactNode,
    category: CostCategory = "other",
  ) => (
    <tr key={label}>
      <th scope="row" className={rowHead}>
        <CostCategoryLabel category={category} className="gap-1.5">
          {label}
        </CostCategoryLabel>
        <small aria-hidden="true" className={unitNote}>
          {unitLabel}
        </small>
      </th>
      {records.map((p) => (
        <td key={p.id} className={valueCell(p.current)}>
          {render(p.tariff)}
          {unitLabel && <span className="sr-only"> {unitLabel}</span>}
        </td>
      ))}
    </tr>
  );
  return (
    <section className="mb-3 min-w-0">
      <button
        className="group flex min-h-12 w-full cursor-pointer items-center gap-2.5 border-0 border-t border-solid border-border bg-transparent p-0 text-left text-sm font-semibold"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <ArrowLeftRight size={16} className="shrink-0" />
        {open ? "Ocultar comparación" : "Comparar precios"}
        <span
          aria-hidden="true"
          className="ml-auto text-xs font-normal text-muted-foreground"
        >
          Hasta 3 tarifas
        </span>
        <ChevronDown size={16} className="group-aria-expanded:rotate-180" />
      </button>
      {open && (
        <div id={id} className="mx-auto max-w-[860px] pt-1 pb-5">
          <div className="flex items-center justify-between gap-3 text-xs-plus max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-1.5">
            <p className="m-0">
              Elige hasta tres períodos.{" "}
              <span className="text-muted-foreground">
                Precios sin impuestos.
              </span>
            </p>
            <label className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
              Potencia en
              <NativeSelect
                className="*:[select]:min-h-[38px] *:[select]:text-foreground"
                aria-label="Comparar potencia en"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Tariff["powerUnit"])}
              >
                <NativeSelectOption value="day">€/kW/día</NativeSelectOption>
                <NativeSelectOption value="month">€/kW/mes</NativeSelectOption>
                <NativeSelectOption value="year">€/kW/año</NativeSelectOption>
              </NativeSelect>
            </label>
          </div>
          <fieldset className="-mx-1 mt-2.5 mb-4 flex min-w-0 flex-nowrap gap-2 overflow-x-auto border-0 p-1">
            <legend className="sr-only">Períodos que quieres comparar</legend>
            {periods.map((p) => (
              <label
                key={p.id}
                className="flex shrink-0 cursor-pointer items-center gap-2 rounded-sm bg-muted px-2.5 py-2 text-xs-plus leading-[1.4] has-disabled:cursor-default has-disabled:opacity-55 has-data-[state=checked]:bg-muted-strong"
              >
                <Checkbox
                  checked={selectedIds.includes(p.id)}
                  disabled={
                    selectedIds.length >= 3 && !selectedIds.includes(p.id)
                  }
                  onCheckedChange={() =>
                    setSelected(
                      selectedIds.includes(p.id)
                        ? selectedIds.filter((id) => id !== p.id)
                        : [...selectedIds, p.id],
                    )
                  }
                  aria-label={`Comparar ${p.tariff.name} · ${shortDate(p.start)}`}
                />
                <span>
                  {p.tariff.name}
                  <small className="block text-2xs text-muted-foreground">
                    {shortDate(p.start)} →{" "}
                    {p.current ? "actual" : shortDate(p.end)}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          {records.length ? (
            <>
              <div
                className={cn(
                  "mx-auto max-w-[660px] overflow-x-auto",
                  records.length > 2 && "max-w-[860px]",
                )}
                role="region"
                aria-label="Precios históricos, desplazamiento horizontal"
                tabIndex={0}
              >
                <table
                  className="w-full min-w-[min(100%,640px)] border-separate border-spacing-0 text-left text-base leading-[1.4] max-[700px]:min-w-full"
                  aria-label="Precios de tus tarifas"
                >
                  <thead>
                    <tr>
                      <th scope="col" className={cn(columnHead, firstCell)}>
                        Precio contratado
                      </th>
                      {records.map((p) => (
                        <th
                          scope="col"
                          key={p.id}
                          className={cn(columnHead, p.current && "bg-accent")}
                        >
                          <span
                            className={cn(
                              "text-3xs tracking-[0.08em] uppercase",
                              p.current && "text-primary",
                            )}
                          >
                            {p.current ? "Actual" : "Anterior"}
                          </span>
                          <strong className="my-1 font-heading text-base leading-[1.4] font-bold text-foreground">
                            {p.tariff.name}
                          </strong>
                          <span>
                            {p.tariff.provider || "Sin comercializadora"}
                          </span>
                          <small className="mt-0.5 text-2xs">
                            {shortDate(p.start)} →{" "}
                            {p.current ? "hoy" : shortDate(p.end)}
                          </small>
                          {byPeriod && p.tariff.kind === "fixed" && (
                            <small className="mt-0.5 text-2xs">
                              Precio único las 24 h
                            </small>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byPeriod ? (
                      <>
                        {row(
                          "Energía · Punta",
                          "€/kWh",
                          (t) => price(t.energyPeak),
                          "energy",
                        )}
                        {row(
                          "Energía · Llano",
                          "€/kWh",
                          (t) =>
                            price(
                              t.kind === "fixed" ? t.energyPeak : t.energyFlat,
                            ),
                          "energy",
                        )}
                        {row(
                          "Energía · Valle",
                          "€/kWh",
                          (t) =>
                            price(
                              t.kind === "fixed"
                                ? t.energyPeak
                                : t.energyValley,
                            ),
                          "energy",
                        )}
                      </>
                    ) : (
                      row(
                        "Energía · 24 h",
                        "€/kWh",
                        (t) => price(t.energyPeak),
                        "energy",
                      )
                    )}
                    <tr>
                      <th scope="row" className={rowHead}>
                        <CostCategoryLabel category="power" className="gap-1.5">
                          Potencia
                        </CostCategoryLabel>
                        <small aria-hidden="true" className={unitNote}>
                          {powerUnitLabels[unit]}
                        </small>
                        <span className={powerNote} aria-hidden="true">
                          Precio unitario · 1 kW en cada período
                        </span>
                      </th>
                      {records.map((p) => (
                        <td key={p.id} className={valueCell(p.current)}>
                          <span>
                            {formatPowerPrice(
                              comparablePowerPrice(p.tariff, unit),
                            )}
                            <span className="sr-only">
                              {" "}
                              {powerUnitLabels[unit]}. Referencia: 1 kW en cada
                              período.
                            </span>
                          </span>
                          <small className={powerNote}>
                            Original: {powerDescription(p.tariff)}
                          </small>
                        </td>
                      ))}
                    </tr>
                    {row("Alquiler de contador", "€/día", (t) =>
                      price(t.meterDay),
                    )}
                    {row("Bono social", "€/día", (t) => price(t.socialDay))}
                    {row("Coste SNOEE", "€/kWh", (t) => price(t.snoeeKwh))}
                    {row("Servicios", "€/mes", (t) => price(t.servicesMonth))}
                    {records.some((p) => estimatedCharges(p.tariff)) &&
                      row("Cargos estimados", "", (t) => (
                        <span className="block text-xs/[1.4] text-muted-foreground">
                          {estimatedCharges(t) || "Ninguno"}
                        </span>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="m-0 mt-3 max-w-[660px] text-xs/[1.6] text-muted-foreground">
              Selecciona un período para ver sus precios.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
