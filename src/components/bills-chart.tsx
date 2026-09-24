"use client";
import { useId, useState } from "react";
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
  chartDrawing,
  chartLegend,
  chartNote,
  chartZero,
  conceptColor,
  detailSwatch,
  interactiveChart,
  monthAmount,
  monthControl,
  monthlyCredit,
  monthlyStack,
  monthName,
  swatch,
} from "./bill-styles";

type Month = {
  month: string;
  label: string;
  amount: number;
  count: number;
  totals: Record<(typeof groups)[number][0], number>;
};
const lineSeries = [...groups, ["paid", "Pagado"]] as const;
type SeriesKey = (typeof lineSeries)[number][0];
const seriesAmount = (month: Month, key: SeriesKey) =>
  key === "paid" ? month.amount : month.totals[key];
/* Each line's colour, and a dash pattern so lines differ without colour. */
const seriesColor: Record<SeriesKey, string> = {
  energy: "text-chart-1",
  power: "text-chart-2",
  other: "text-chart-3",
  taxes: "text-chart-4",
  unknown: "text-chart-5",
  credit: "text-destructive",
  paid: "text-foreground",
};
const line = "stroke-current stroke-3 [vector-effect:non-scaling-stroke]";
const seriesLine: Record<SeriesKey, string> = {
  energy: line,
  power: cn(line, "[stroke-dasharray:7_3]"),
  other: cn(line, "[stroke-dasharray:2_3]"),
  taxes: cn(line, "[stroke-dasharray:9_3_2_3]"),
  unknown: cn(line, "[stroke-dasharray:2_5]"),
  credit: cn(line, "[stroke-dasharray:6_3]"),
  paid: cn(line, "stroke-4"),
};
const point =
  "fill-current stroke-card stroke-2 [vector-effect:non-scaling-stroke]";

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
  const [hiddenSeries, setHiddenSeries] = useState<SeriesKey[]>([]);
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
  const top = Math.max(
    1,
    ...months.flatMap((m) =>
      view === "bars"
        ? [m.amount - m.totals.credit]
        : visibleSeries.map(([key]) => seriesAmount(m, key)),
    ),
  );
  const bottom = Math.min(
    0,
    ...months.flatMap((m) =>
      view === "bars"
        ? [m.totals.credit]
        : visibleSeries.map(([key]) => seriesAmount(m, key)),
    ),
  );
  const scale = 190 / (top - bottom);
  const y = (amount: number) => 38 + (top - amount) * scale;
  const zero = y(0);
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
                        className={cn(
                          "h-3 w-7 group-aria-[pressed=false]:opacity-40",
                          seriesColor[key],
                        )}
                      >
                        <line
                          x1="0"
                          x2="28"
                          y1="6"
                          y2="6"
                          className={seriesLine[key]}
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
              <svg
                viewBox="0 0 1200 260"
                preserveAspectRatio="none"
                aria-hidden="true"
                className={chartDrawing}
              >
                <line
                  x1="0"
                  x2="1200"
                  y1={zero}
                  y2={zero}
                  className={chartZero}
                />
                {view === "line" &&
                  visibleSeries.map(([key]) => (
                    <g key={key} data-series={key} className={seriesColor[key]}>
                      {months.map((m, i) =>
                        m.count ? (
                          <g key={m.month}>
                            {i > 0 && months[i - 1].count > 0 && (
                              <line
                                x1={(i - 1) * 100 + 50}
                                y1={y(seriesAmount(months[i - 1], key))}
                                x2={i * 100 + 50}
                                y2={y(seriesAmount(m, key))}
                                className={seriesLine[key]}
                              />
                            )}
                            <circle
                              cx={i * 100 + 50}
                              cy={y(seriesAmount(m, key))}
                              r={m.month === active.month ? 6 : 4}
                              className={point}
                            />
                          </g>
                        ) : null,
                      )}
                    </g>
                  ))}
              </svg>
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
                  {view === "bars" && (
                    <>
                      <span
                        className={monthlyStack}
                        style={{ bottom: `${260 - zero}px` }}
                        aria-hidden="true"
                      >
                        {groups
                          .filter(([key]) => key !== "credit")
                          .map(
                            ([key]) =>
                              m.totals[key] > 0 && (
                                <span
                                  key={key}
                                  className={conceptColor[key]}
                                  style={{
                                    height: `${m.totals[key] * scale}px`,
                                  }}
                                />
                              ),
                          )}
                      </span>
                      {m.totals.credit < 0 && (
                        <span
                          className={monthlyCredit}
                          aria-hidden="true"
                          style={{
                            top: `${zero}px`,
                            height: `${-m.totals.credit * scale}px`,
                          }}
                        />
                      )}
                    </>
                  )}
                  <span className={monthName}>{m.label}</span>
                </button>
              ))}
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
