"use client";
import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, ChartLine, Zap } from "lucide-react";
import ConsumptionChart from "./consumption-chart";
import ChartScroll from "./chart-scroll";
import type { ConsumptionMonth } from "@/lib/bill-consumption";
import { money } from "@/lib/domain";
import {
  billGroups as groups,
  billMonthLabel as fullMonth,
} from "@/lib/bill-data";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  chartDetail,
  chartDetailHead,
  chartDetailList,
  chartDetailTotal,
  chartLegend,
  chartNote,
  conceptColor,
  detailSwatch,
  chartAxisWidth,
  interactiveChart,
  lineStyle,
  monthButtons,
  monthAmount,
  monthControl,
  monthName,
  swatch,
} from "./bill-styles";

// Recharts downloads only when a chart is on screen.
const BillsBars = dynamic(
  () => import("./monthly-charts").then((m) => m.BillsBars),
  { ssr: false },
);
const BillsLines = dynamic(
  () => import("./monthly-charts").then((m) => m.BillsLines),
  { ssr: false },
);

type Month = {
  month: string;
  label: string;
  amount: number;
  count: number;
  totals: Record<(typeof groups)[number][0], number>;
};
const lineSeries = [...groups, ["paid", "Pagado"]] as const;
export default function BillsChart({
  months,
  year,
  consumption,
  view,
  onViewChange,
}: {
  months: Month[];
  year: string;
  consumption: ConsumptionMonth[];
  view: "bars" | "line" | "consumption";
  onViewChange: (view: "bars" | "line" | "consumption") => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const detailId = useId();
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const availableSeries = lineSeries.filter(
    ([key]) =>
      (key !== "credit" && key !== "unknown") ||
      months.some((m) => m.totals[key] !== 0),
  );
  const visibleSeries = availableSeries.filter(
    ([key]) => !hiddenSeries.includes(key),
  );
  const active =
    months.find((m) => m.month === selected) ??
    months.findLast((m) => m.count) ??
    months[0];
  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={view}
          className="rounded-lg bg-muted p-1 *:data-[state=on]:bg-card *:data-[state=on]:shadow-sm max-[520px]:*:flex-1 max-[380px]:[&_svg]:hidden"
          aria-label="Tipo de gráfico"
        >
          <ToggleGroupItem value="bars" onClick={() => onViewChange("bars")}>
            <BarChart3 size={16} /> Barras
          </ToggleGroupItem>
          <ToggleGroupItem value="line" onClick={() => onViewChange("line")}>
            <ChartLine size={16} /> Evolución
          </ToggleGroupItem>
          <ToggleGroupItem
            value="consumption"
            onClick={() => onViewChange("consumption")}
          >
            <Zap size={16} /> Consumo
          </ToggleGroupItem>
        </ToggleGroup>
        <span className={chartNote}>
          Pasa el cursor, toca o selecciona un mes para ver el detalle.
        </span>
      </div>
      {view === "consumption" ? (
        <ConsumptionChart months={consumption} year={year} />
      ) : (
        <>
          {view === "bars" ? (
            <ul className={chartLegend} aria-label="Conceptos del gráfico">
              {groups.map(([key, label]) => (
                <li key={key}>
                  <span className={cn(swatch, conceptColor[key])} />
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <ul
                className={cn(chartLegend, "gap-x-3 gap-y-1.5")}
                aria-label="Conceptos del gráfico. Activa o desactiva cada línea."
              >
                {availableSeries.map(([key, label]) => (
                  <li key={key}>
                    <button
                      type="button"
                      className="group inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground aria-[pressed=false]:bg-background aria-[pressed=false]:line-through"
                      aria-pressed={!hiddenSeries.includes(key)}
                      onClick={() =>
                        setHiddenSeries((hidden) =>
                          hidden.includes(key)
                            ? hidden.filter((item) => item !== key)
                            : [...hidden, key],
                        )
                      }
                    >
                      <svg
                        viewBox="0 0 28 12"
                        aria-hidden="true"
                        className="h-3 w-7 group-aria-[pressed=false]:opacity-40"
                      >
                        <line
                          x1="0"
                          x2="28"
                          y1="6"
                          y2="6"
                          stroke={lineStyle[key].color}
                          strokeWidth={lineStyle[key].width}
                          strokeDasharray={lineStyle[key].dash}
                        />
                      </svg>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
              <p className={cn(chartNote, "mt-6")}>
                Cada línea muestra un concepto; «Pagado» es el importe después
                de descuentos. Pulsa la leyenda para mostrar u ocultar líneas.
                Los meses sin facturas interrumpen las líneas.
              </p>
            </>
          )}
          <ChartScroll label={`Gráfico mensual de ${year}`}>
            <div className={interactiveChart}>
              <div className="absolute inset-0">
                {view === "bars" ? (
                  <BillsBars months={months} />
                ) : (
                  <BillsLines
                    months={months}
                    series={visibleSeries.map(([key]) => key)}
                    active={months.indexOf(active)}
                  />
                )}
              </div>
              <div className={monthButtons} style={{ left: chartAxisWidth }}>
                {months.map((m) => (
                  <button
                    key={m.month}
                    type="button"
                    className={monthControl}
                    aria-pressed={active.month === m.month}
                    aria-label={`${fullMonth(m.month)}: ${m.count ? money(m.amount) : "sin facturas"}`}
                    aria-describedby={
                      active.month === m.month ? detailId : undefined
                    }
                    onMouseEnter={() => setSelected(m.month)}
                    onFocus={() => setSelected(m.month)}
                    onClick={() => setSelected(m.month)}
                  >
                    <span className={monthAmount}>
                      {m.count ? money(m.amount) : "—"}
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
              <strong>{fullMonth(active.month)}</strong>
              <span className={chartNote}>
                {active.count
                  ? `${active.count} ${active.count === 1 ? "factura" : "facturas"}`
                  : "Sin facturas registradas"}
              </span>
            </div>
            {active.count > 0 && (
              <dl className={chartDetailList}>
                {groups
                  .filter(
                    ([key]) =>
                      (key !== "unknown" && key !== "credit") ||
                      active.totals[key] !== 0,
                  )
                  .map(([key, label]) => (
                    <div key={key}>
                      <dt>
                        <span className={cn(detailSwatch, conceptColor[key])} />
                        {label}
                      </dt>
                      <dd>{money(active.totals[key])}</dd>
                    </div>
                  ))}
                <div className={chartDetailTotal}>
                  <dt>Total antes de descuentos</dt>
                  <dd>{money(active.amount - active.totals.credit)}</dd>
                </div>
                <div className={chartDetailTotal}>
                  <dt>Pagado</dt>
                  <dd>{money(active.amount)}</dd>
                </div>
              </dl>
            )}
          </div>
        </>
      )}
    </>
  );
}
