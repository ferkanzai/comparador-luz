"use client";
import { useId, useState } from "react";
import { BarChart3, ChartLine } from "lucide-react";
import { money } from "@/lib/domain";

const groups = [
  ["energy", "Energía"],
  ["power", "Potencia"],
  ["other", "Otros cargos"],
  ["taxes", "Impuestos"],
  ["unknown", "Sin desglose"],
  ["credit", "Créditos"],
] as const;
type Month = {
  month: string;
  label: string;
  amount: number;
  count: number;
  totals: Record<(typeof groups)[number][0], number>;
};
const fullMonth = (month: string) =>
  new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01`));

export default function BillsChart({
  months,
  year,
}: {
  months: Month[];
  year: string;
}) {
  const [view, setView] = useState<"bars" | "line">("bars");
  const [selected, setSelected] = useState<string | null>(null);
  const detailId = useId();
  const active =
    months.find((m) => m.month === selected) ??
    months.findLast((m) => m.count) ??
    months[0];
  const top = Math.max(
    1,
    ...months.map((m) =>
      view === "bars" ? m.amount - m.totals.credit : m.amount,
    ),
  );
  const bottom = Math.min(
    0,
    ...months.map((m) => (view === "bars" ? m.totals.credit : m.amount)),
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
            onClick={() => setView("bars")}
          >
            <BarChart3 size={16} /> Barras
          </button>
          <button
            type="button"
            aria-pressed={view === "line"}
            className={view === "line" ? "selected" : ""}
            onClick={() => setView("line")}
          >
            <ChartLine size={16} /> Evolución
          </button>
        </div>
        <span className="small muted">
          Pasa el cursor, toca o selecciona un mes para ver el detalle.
        </span>
      </div>
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
        <p className="small muted chart-line-note">
          Total pagado cada mes, después de créditos. Los meses sin facturas
          interrumpen la línea.
        </p>
      )}
      <div
        className="chart-scroll"
        role="region"
        aria-label={`Gráfico mensual de ${year}. Desplázate para ver todos los meses.`}
        tabIndex={0}
      >
        <div className="interactive-chart">
          <svg
            viewBox="0 0 1200 260"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="chart-drawing"
          >
            <line x1="0" x2="1200" y1={zero} y2={zero} className="chart-zero" />
            {view === "line" &&
              months.map((m, i) =>
                m.count ? (
                  <g key={m.month}>
                    {i > 0 && months[i - 1].count > 0 && (
                      <line
                        x1={(i - 1) * 100 + 50}
                        y1={y(months[i - 1].amount)}
                        x2={i * 100 + 50}
                        y2={y(m.amount)}
                        className="spending-line"
                      />
                    )}
                    <circle
                      cx={i * 100 + 50}
                      cy={y(m.amount)}
                      r={m.month === active.month ? 7 : 5}
                      className="spending-point"
                    />
                  </g>
                ) : null,
              )}
          </svg>
          {months.map((m) => (
            <button
              key={m.month}
              type="button"
              className="month-control"
              aria-pressed={active.month === m.month}
              aria-label={`${fullMonth(m.month)}: ${m.count ? money(m.amount) : "sin facturas"}`}
              aria-describedby={active.month === m.month ? detailId : undefined}
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
                              style={{ height: `${m.totals[key] * scale}px` }}
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
      </div>
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
              <dt>Total pagado</dt>
              <dd>{money(active.amount)}</dd>
            </div>
          </dl>
        )}
      </div>
    </>
  );
}
