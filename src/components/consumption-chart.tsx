"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  consumptionGroups,
  formatKwh,
  type ConsumptionMonth,
} from "@/lib/bill-consumption";
import { billMonthLabel } from "@/lib/bill-data";

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
  const max = Math.max(1, ...months.map((m) => m.total ?? 0));
  return (
    <div className="consumption-chart">
      <ul className="chart-legend" aria-label="Períodos de consumo">
        {consumptionGroups.map(([key, label]) => (
          <li key={key}>
            <span className={`swatch consumption-${key}`} />
            {label}
          </li>
        ))}
      </ul>
      <p className="small muted">
        Consumo registrado, en kWh. «Sin reparto» conserva las facturas que solo
        tienen consumo total. Un mes parcial suma únicamente las facturas con
        kWh conocidos.
      </p>
      <div
        ref={scrollRef}
        className="chart-scroll"
        role="region"
        aria-label={`Consumo mensual de ${year}. Desplázate para ver todos los meses.`}
        tabIndex={0}
      >
        <div className="interactive-chart">
          <svg
            viewBox="0 0 1200 260"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="chart-drawing"
          >
            <line x1="0" x2="1200" y1="228" y2="228" className="chart-zero" />
          </svg>
          {months.map((m) => (
            <button
              key={m.month}
              type="button"
              className="month-control"
              aria-pressed={active.month === m.month}
              aria-label={`${billMonthLabel(m.month)}: ${m.total === null ? "sin consumo registrado" : formatKwh(m.total)}${m.missing ? `, faltan kWh de ${m.missing} facturas` : ""}`}
              aria-describedby={active.month === m.month ? detailId : undefined}
              onMouseEnter={() => setSelected(m.month)}
              onFocus={() => setSelected(m.month)}
              onClick={() => setSelected(m.month)}
            >
              <span className="month-amount">
                {m.total === null ? "—" : formatKwh(m.total)}
                {m.recorded > 0 && m.missing > 0 && (
                  <small className="block">Parcial</small>
                )}
              </span>
              <span
                className="monthly-stack"
                style={{ bottom: 32 }}
                aria-hidden="true"
              >
                {consumptionGroups.map(
                  ([key]) =>
                    m.totals[key] > 0 && (
                      <span
                        key={key}
                        className={`consumption-${key}`}
                        style={{ height: (m.totals[key] / max) * 180 }}
                      />
                    ),
                )}
              </span>
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
          <strong>{billMonthLabel(active.month)}</strong>
          <span className="small muted">
            {active.recorded} {active.recorded === 1 ? "factura" : "facturas"}{" "}
            con consumo
            {active.missing ? ` · ${active.missing} sin kWh` : ""}
          </span>
        </div>
        {active.total !== null ? (
          <dl>
            {consumptionGroups.map(([key, label]) => (
              <div key={key}>
                <dt>
                  <span className={`swatch consumption-${key}`} />
                  {label}
                </dt>
                <dd>{formatKwh(active.totals[key])}</dd>
              </div>
            ))}
            <div className="chart-detail-total">
              <dt>
                {active.missing
                  ? "Total conocido (parcial)"
                  : "Total registrado"}
              </dt>
              <dd>{formatKwh(active.total)}</dd>
            </div>
          </dl>
        ) : (
          <p className="small muted">
            Sin consumo registrado. Añade los kWh al editar una factura.
          </p>
        )}
      </div>
      <p className="small muted">
        Usamos el mes elegido para cada factura, sin repartir su consumo entre
        meses. Un dato desconocido no equivale a cero.
      </p>
      <details className="form-section">
        <summary>Ver consumo mensual en tabla</summary>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Consumo mensual en kWh"
        >
          <table>
            <caption>
              kWh registrados · Los meses parciales no incluyen las facturas sin
              consumo.
            </caption>
            <thead>
              <tr>
                <th scope="col">Mes</th>
                {consumptionGroups.map(([key, label]) => (
                  <th scope="col" key={key}>
                    {label}
                  </th>
                ))}
                <th scope="col">Total</th>
                <th scope="col">Cobertura</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{m.label}</th>
                  {consumptionGroups.map(([key]) => (
                    <td key={key}>
                      {m.total === null ? "—" : formatKwh(m.totals[key])}
                    </td>
                  ))}
                  <td>{m.total === null ? "—" : formatKwh(m.total)}</td>
                  <td>
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
