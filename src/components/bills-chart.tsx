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
      <div className="chart-toolbar">
        <div className="segmented" role="group" aria-label="Tipo de gráfico">
          <button
            type="button"
            aria-pressed={view === "bars"}
            className={view === "bars" ? "selected" : ""}
            onClick={() => onViewChange("bars")}
          >
            <BarChart3 size={16} /> Barras
          </button>
          <button
            type="button"
            aria-pressed={view === "line"}
            className={view === "line" ? "selected" : ""}
            onClick={() => onViewChange("line")}
          >
            <ChartLine size={16} /> Evolución
          </button>
          <button
            type="button"
            aria-pressed={view === "consumption"}
            className={view === "consumption" ? "selected" : ""}
            onClick={() => onViewChange("consumption")}
          >
            <Zap size={16} /> Consumo
          </button>
        </div>
        <span className="small muted">
          Pasa el cursor, toca o selecciona un mes para ver el detalle.
        </span>
      </div>
      {view === "consumption" ? (
        <ConsumptionChart months={consumption} year={year} />
      ) : (
        <>
          {view === "bars" ? (
            <ul className="chart-legend" aria-label="Conceptos del gráfico">
              {groups.map(([key, label]) => (
                <li key={key}>
                  <span className={`swatch stack-${key}`} />
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <ul
                className="chart-legend line-legend"
                aria-label="Conceptos del gráfico. Activa o desactiva cada línea."
              >
                {availableSeries.map(([key, label]) => (
                  <li key={key}>
                    <button
                      type="button"
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
                        className={`series-key series-${key}`}
                      >
                        <line
                          x1="0"
                          x2="28"
                          y1="6"
                          y2="6"
                          className="spending-line"
                        />
                      </svg>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="small muted chart-line-note">
                Cada línea muestra un concepto; «Pagado» es el importe después
                de descuentos. Pulsa la leyenda para mostrar u ocultar líneas. Los
                meses sin facturas interrumpen las líneas.
              </p>
            </>
          )}
          <ChartScroll label={`Gráfico mensual de ${year}`}>
            <div className="interactive-chart">
              <svg
                viewBox="0 0 1200 260"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="chart-drawing"
              >
                <line
                  x1="0"
                  x2="1200"
                  y1={zero}
                  y2={zero}
                  className="chart-zero"
                />
                {view === "line" &&
                  visibleSeries.map(([key]) => (
                    <g key={key} data-series={key} className={`series-${key}`}>
                      {months.map((m, i) =>
                        m.count ? (
                          <g key={m.month}>
                            {i > 0 && months[i - 1].count > 0 && (
                              <line
                                x1={(i - 1) * 100 + 50}
                                y1={y(seriesAmount(months[i - 1], key))}
                                x2={i * 100 + 50}
                                y2={y(seriesAmount(m, key))}
                                className="spending-line"
                              />
                            )}
                            <circle
                              cx={i * 100 + 50}
                              cy={y(seriesAmount(m, key))}
                              r={m.month === active.month ? 6 : 4}
                              className="spending-point"
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
                  className="month-control"
                  aria-pressed={active.month === m.month}
                  aria-label={`${fullMonth(m.month)}: ${m.count ? money(m.amount) : "sin facturas"}`}
                  aria-describedby={
                    active.month === m.month ? detailId : undefined
                  }
                  onMouseEnter={() => setSelected(m.month)}
                  onFocus={() => setSelected(m.month)}
                  onClick={() => setSelected(m.month)}
                >
                  <span className="month-amount">
                    {m.count ? money(m.amount) : "—"}
                  </span>
                  {view === "bars" && (
                    <>
                      <span
                        className="monthly-stack"
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
                                  className={`stack-${key}`}
                                  style={{
                                    height: `${m.totals[key] * scale}px`,
                                  }}
                                />
                              ),
                          )}
                      </span>
                      {m.totals.credit < 0 && (
                        <span
                          className="monthly-credit stack-credit"
                          aria-hidden="true"
                          style={{
                            top: `${zero}px`,
                            height: `${-m.totals.credit * scale}px`,
                          }}
                        />
                      )}
                    </>
                  )}
                  <span className="month-name">{m.label}</span>
                </button>
              ))}
            </div>
          </ChartScroll>
          <div
            className="chart-detail"
            id={detailId}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div>
              <strong>{fullMonth(active.month)}</strong>
              <span className="small muted">
                {active.count
                  ? `${active.count} ${active.count === 1 ? "factura" : "facturas"}`
                  : "Sin facturas registradas"}
              </span>
            </div>
            {active.count > 0 && (
              <dl>
                {groups
                  .filter(
                    ([key]) =>
                      (key !== "unknown" && key !== "credit") ||
                      active.totals[key] !== 0,
                  )
                  .map(([key, label]) => (
                    <div key={key}>
                      <dt>
                        <span className={`swatch stack-${key}`} />
                        {label}
                      </dt>
                      <dd>{money(active.totals[key])}</dd>
                    </div>
                  ))}
                <div className="chart-detail-total">
                  <dt>Total antes de descuentos</dt>
                  <dd>{money(active.amount - active.totals.credit)}</dd>
                </div>
                <div className="chart-detail-total">
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
