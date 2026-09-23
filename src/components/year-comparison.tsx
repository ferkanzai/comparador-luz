"use client";
import { useState } from "react";
import { BarChart3, Receipt, Zap } from "lucide-react";
import { type Bill, money } from "@/lib/domain";
import { formatKwh } from "@/lib/bill-consumption";
import {
  compareYears,
  invoiceYears,
  type YearMetric,
} from "@/lib/year-comparison";

export default function YearComparison({ bills }: { bills: Bill[] }) {
  const years = invoiceYears(bills);
  const [selection, setSelection] = useState({
    first: years[1],
    second: years[0],
  });
  const [metric, setMetric] = useState<YearMetric>("paid");
  const first = years.includes(selection.first) ? selection.first : years[1];
  const second =
    years.includes(selection.second) && selection.second !== first
      ? selection.second
      : years.find((year) => year !== first)!;
  if (years.length < 2) return null;
  const comparison = compareYears(bills, first, second, metric);
  const format = metric === "paid" ? money : formatKwh;
  const signed = (value: number) => `${value > 0 ? "+" : ""}${format(value)}`;
  const values = comparison.rows.flatMap((row) => [
    row.first.value ?? 0,
    row.second.value ?? 0,
  ]);
  const top = Math.max(1, ...values);
  const bottom = Math.min(0, ...values);
  const scale = 170 / (top - bottom);
  const zero = 58 + top * scale;
  const description =
    metric === "paid"
      ? "Importe pagado después de descuentos"
      : "Consumo registrado en kWh";
  return (
    <section aria-label="Comparación de facturas por años">
      <div className="panel year-comparison">
        <div className="year-controls">
          <div className="form-grid two">
            <label className="auth-label">
              Año de referencia
              <select
                value={first}
                onChange={(event) =>
                  setSelection({
                    first: event.target.value,
                    second: event.target.value === second ? first : second,
                  })
                }
              >
                {years.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </label>
            <label className="auth-label">
              Año a comparar
              <select
                value={second}
                onChange={(event) =>
                  setSelection({
                    first: event.target.value === first ? second : first,
                    second: event.target.value,
                  })
                }
              >
                {years.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="segmented" role="group" aria-label="Dato a comparar">
            <button
              type="button"
              className={metric === "paid" ? "selected" : ""}
              aria-pressed={metric === "paid"}
              onClick={() => setMetric("paid")}
            >
              <Receipt size={16} aria-hidden="true" />
              Pagado
            </button>
            <button
              type="button"
              className={metric === "consumption" ? "selected" : ""}
              aria-pressed={metric === "consumption"}
              onClick={() => setMetric("consumption")}
            >
              <Zap size={16} aria-hidden="true" />
              Consumo
            </button>
          </div>
        </div>
        <div className="year-summary" role="status" aria-live="polite">
          <div>
            <span className="eyebrow">
              {comparison.commonMonths}{" "}
              {comparison.commonMonths === 1
                ? "MES COMPARABLE"
                : "MESES COMPARABLES"}
            </span>
            <strong className="big-amount">
              {comparison.commonMonths ? signed(comparison.difference) : "—"}
            </strong>
            <span>
              {comparison.commonMonths
                ? `${second} respecto a ${first}${comparison.percent !== null ? ` · ${comparison.percent > 0 ? "+" : ""}${comparison.percent.toLocaleString("es-ES", { maximumFractionDigits: 1 })} %` : ""}`
                : "Aún no hay meses con datos comparables en ambos años."}
            </span>
          </div>
          <dl>
            <div>
              <dt>
                <span className="swatch year-first" />
                {first}
              </dt>
              <dd>
                {comparison.commonMonths ? format(comparison.firstTotal) : "—"}
              </dd>
            </div>
            <div>
              <dt>
                <span className="swatch year-second" />
                {second}
              </dt>
              <dd>
                {comparison.commonMonths ? format(comparison.secondTotal) : "—"}
              </dd>
            </div>
          </dl>
        </div>
        <p className="small muted">
          La diferencia usa solo los mismos meses con registros en ambos años
          {metric === "consumption" ? " y kWh en todas sus facturas" : ""}. No
          extrapolamos el año completo ni interpretamos la diferencia como
          ahorro de tarifa.
        </p>
        <div className="year-chart-heading">
          <h3>
            <BarChart3 size={18} aria-hidden="true" />
            Mes a mes
          </h3>
          <ul className="chart-legend" aria-label="Años del gráfico">
            <li>
              <span className="swatch year-first" />
              {first}
            </li>
            <li>
              <span className="swatch year-second" />
              {second}
            </li>
          </ul>
        </div>
        <p className="small muted">
          {description}. «—» indica datos desconocidos
          {metric === "consumption"
            ? "; * marca un consumo parcial, excluido de la diferencia"
            : ""}
          . Desliza el gráfico para ver todos los meses.
        </p>
        <div
          className="chart-scroll"
          tabIndex={0}
          role="region"
          aria-label={`${description}: ${first} y ${second}`}
        >
          <div
            className="year-chart"
            role="img"
            aria-label={`Comparación mensual de ${first} y ${second}. Valores disponibles en la tabla de debajo.`}
          >
            <svg
              className="chart-drawing"
              viewBox="0 0 1200 260"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line
                x1="0"
                x2="1200"
                y1={zero}
                y2={zero}
                className="chart-zero"
              />
            </svg>
            {comparison.rows.map((row) => (
              <div key={row.label} className="year-month">
                <div className="year-month-values">
                  {[row.first, row.second].map((entry, i) => (
                    <span
                      key={i}
                      className={i ? "year-second-text" : "year-first-text"}
                    >
                      {entry.value === null ? "—" : format(entry.value)}
                      {entry.value !== null && entry.missing > 0 ? " *" : ""}
                    </span>
                  ))}
                </div>
                {[row.first, row.second].map(
                  (entry, i) =>
                    entry.value !== null && (
                      <span
                        key={i}
                        className={`year-bar ${i ? "year-second" : "year-first"}`}
                        style={{
                          left: i ? "52%" : "22%",
                          top:
                            entry.value >= 0
                              ? zero - entry.value * scale
                              : zero,
                          height: Math.abs(entry.value) * scale,
                        }}
                      />
                    ),
                )}
                <span className="month-name">{row.label}</span>
              </div>
            ))}
          </div>
        </div>
        <details className="form-section">
          <summary>Ver comparación mensual en tabla</summary>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Tabla de comparación anual"
          >
            <table>
              <caption className="bill-table-caption">
                {description} · Diferencia = {second} − {first}. Solo comparamos
                meses con datos suficientes.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Mes</th>
                  <th scope="col">{first}</th>
                  <th scope="col">{second}</th>
                  <th scope="col">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {[row.first, row.second].map((entry, i) => (
                      <td key={i}>
                        {entry.value === null ? "—" : format(entry.value)}
                        <small className="block muted">
                          {entry.count}{" "}
                          {entry.count === 1 ? "factura" : "facturas"}
                          {entry.missing
                            ? ` · ${entry.missing} sin kWh${entry.value !== null ? " · parcial" : ""}`
                            : ""}
                        </small>
                      </td>
                    ))}
                    <td>
                      {row.difference === null ? "—" : signed(row.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">
                    Meses comparables ({comparison.commonMonths})
                  </th>
                  <td>
                    {comparison.commonMonths
                      ? format(comparison.firstTotal)
                      : "—"}
                  </td>
                  <td>
                    {comparison.commonMonths
                      ? format(comparison.secondTotal)
                      : "—"}
                  </td>
                  <td>
                    {comparison.commonMonths
                      ? signed(comparison.difference)
                      : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </details>
        <p className="small muted">
          Cada factura cuenta en su mes de registro, aunque abarque otras
          fechas. Un mes con facturas no garantiza que estén registradas todas
          las del período.
        </p>
      </div>
    </section>
  );
}
