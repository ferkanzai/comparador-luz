"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  consumptionGroups,
  formatKwh,
  type ConsumptionMonth,
} from "@/lib/bill-consumption";
import { billMonthLabel } from "@/lib/bill-data";
import dynamic from "next/dynamic";
import ChartScroll from "./chart-scroll";
import { formDisclosure } from "./tariff-form-sections";
import { cn } from "@/lib/utils";
import {
  bodyCell,
  chartDetail,
  chartDetailHead,
  chartDetailList,
  chartDetailTotal,
  chartLegend,
  chartNote,
  detailSwatch,
  chartAxisWidth,
  headCell,
  interactiveChart,
  monthAmount,
  monthButtons,
  monthControl,
  monthName,
  swatch,
  table,
  tableCaption,
  tableScroll,
} from "./bill-styles";

// Recharts downloads only when the chart is on screen.
const ConsumptionBars = dynamic(
  () => import("./monthly-charts").then((m) => m.ConsumptionBars),
  { ssr: false },
);

/* Energy periods, and the bills with a total but no periods. */
const periodColor = {
  peakKwh: "bg-period-1",
  flatKwh: "bg-period-2",
  valleyKwh: "bg-period-3",
  unallocated:
    "bg-[image:repeating-linear-gradient(135deg,var(--chart-5-soft),var(--chart-5-soft)_3px,var(--border)_3px,var(--border)_6px)]",
} as const;

export default function ConsumptionChart({
  months,
  year,
}: {
  months: ConsumptionMonth[];
  year: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const detailId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestMonthIndex = Math.max(
    0,
    months.findLastIndex((m) => m.recorded),
  );
  useEffect(() => {
    const chart = scrollRef.current;
    if (chart)
      chart.scrollLeft =
        ((latestMonthIndex + 0.5) * chart.scrollWidth) / 12 -
        chart.clientWidth / 2;
  }, [year, latestMonthIndex]);
  const active =
    months.find((m) => m.month === selected) ??
    months.findLast((m) => m.recorded) ??
    months[0];
  return (
    <div>
      <ul className={chartLegend} aria-label="Períodos de consumo">
        {consumptionGroups.map(([key, label]) => (
          <li key={key}>
            <span className={cn(swatch, periodColor[key])} />
            {label}
          </li>
        ))}
      </ul>
      <p className={chartNote}>
        Consumo registrado, en kWh. «Sin reparto» conserva las facturas que solo
        tienen consumo total. Un mes parcial suma únicamente las facturas con
        kWh conocidos.
      </p>
      <ChartScroll ref={scrollRef} label={`Consumo mensual de ${year}`}>
        <div className={cn(interactiveChart, "min-w-[1080px]")}>
          <div className="absolute inset-0">
            <ConsumptionBars months={months} />
          </div>
          <div className={monthButtons} style={{ left: chartAxisWidth }}>
            {months.map((m) => (
              <button
                key={m.month}
                type="button"
                className={monthControl}
                aria-pressed={active.month === m.month}
                aria-label={`${billMonthLabel(m.month)}: ${m.total === null ? "sin consumo registrado" : formatKwh(m.total)}${m.missing ? `, faltan kWh de ${m.missing} facturas` : ""}`}
                aria-describedby={
                  active.month === m.month ? detailId : undefined
                }
                onMouseEnter={() => setSelected(m.month)}
                onFocus={() => setSelected(m.month)}
                onClick={() => setSelected(m.month)}
              >
                <span className={cn(monthAmount, "text-xs-plus")}>
                  {m.total === null ? "—" : formatKwh(m.total)}
                  {m.recorded > 0 && m.missing > 0 && (
                    <small className="block text-sm-plus">Parcial</small>
                  )}
                </span>
                <span className={monthName}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </ChartScroll>
      <div
        className={chartDetail}
        id={detailId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className={chartDetailHead}>
          <strong>{billMonthLabel(active.month)}</strong>
          <span className={chartNote}>
            {active.recorded} {active.recorded === 1 ? "factura" : "facturas"}{" "}
            con consumo
            {active.missing ? ` · ${active.missing} sin kWh` : ""}
          </span>
        </div>
        {active.total !== null ? (
          <dl className={chartDetailList}>
            {consumptionGroups.map(([key, label]) => (
              <div key={key}>
                <dt>
                  <span className={cn(detailSwatch, periodColor[key])} />
                  {label}
                </dt>
                <dd>{formatKwh(active.totals[key])}</dd>
              </div>
            ))}
            <div className={chartDetailTotal}>
              <dt>
                {active.missing
                  ? "Total conocido (parcial)"
                  : "Total registrado"}
              </dt>
              <dd>{formatKwh(active.total)}</dd>
            </div>
          </dl>
        ) : (
          <p className={chartNote}>
            Sin consumo registrado. Añade los kWh al editar una factura.
          </p>
        )}
      </div>
      <p className={chartNote}>
        Usamos el mes elegido para cada factura, sin repartir su consumo entre
        meses. Un dato desconocido no equivale a cero.
      </p>
      <details className={formDisclosure}>
        <summary>Ver consumo mensual en tabla</summary>
        <div
          className={tableScroll}
          tabIndex={0}
          role="region"
          aria-label="Consumo mensual en kWh"
        >
          <table className={table}>
            <caption className={cn(tableCaption, "text-base/[1.6]")}>
              kWh registrados · Los meses parciales no incluyen las facturas sin
              consumo.
            </caption>
            <thead>
              <tr>
                <th className={headCell} scope="col">
                  Mes
                </th>
                {consumptionGroups.map(([key, label]) => (
                  <th className={headCell} scope="col" key={key}>
                    {label}
                  </th>
                ))}
                <th className={headCell} scope="col">
                  Total
                </th>
                <th className={headCell} scope="col">
                  Cobertura
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <th className={headCell} scope="row">
                    {m.label}
                  </th>
                  {consumptionGroups.map(([key]) => (
                    <td key={key} className={bodyCell}>
                      {m.total === null ? "—" : formatKwh(m.totals[key])}
                    </td>
                  ))}
                  <td className={bodyCell}>
                    {m.total === null ? "—" : formatKwh(m.total)}
                  </td>
                  <td className={bodyCell}>
                    {m.recorded}/{m.recorded + m.missing} facturas
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
