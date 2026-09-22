"use client";
import { useState } from "react";
import { Plus, Receipt, Pencil, Trash2 } from "lucide-react";
import {
  money,
  today,
  numberOf,
  shortDate,
  type Bill,
  type Workspace,
} from "@/lib/domain";
import {
  billBuckets,
  billLines,
  billGroups as groups,
  billMonthLabel,
  billTotal,
} from "@/lib/bill-data";
import { Empty } from "./ui";
import BillForm from "./bill-form";
import BillsChart from "./bills-chart";
import YearComparison from "./year-comparison";
import { invoiceYears } from "@/lib/year-comparison";
import { consumptionMonths, formatKwh } from "@/lib/bill-consumption";
export default function Bills({
  workspace: w,
  update,
}: {
  workspace: Workspace;
  update: (w: Workspace) => void;
}) {
  const [editing, setEditing] = useState<Bill | null>(null);
  const [year, setYear] = useState(today().slice(0, 4));
  const [view, setView] = useState<"months" | "years">("months");
  const hasMultipleYears = invoiceYears(w.bills).length > 1;
  const showYears = view === "years" && hasMultipleYears;
  const [chartView, setChartView] = useState<"bars" | "line" | "consumption">(
    "bars",
  );
  const consumption = consumptionMonths(w.bills, year);
  const knownKwh = consumption.reduce((sum, m) => sum + (m.total ?? 0), 0);
  const recordedConsumption = consumption.reduce(
    (sum, m) => sum + m.recorded,
    0,
  );
  const bills = w.bills
    .filter((b) => b.month.startsWith(year))
    .sort((a, b) => b.month.localeCompare(a.month));
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const entries = bills.filter((b) => b.month === month);
    const totals = {
      energy: 0,
      power: 0,
      other: 0,
      taxes: 0,
      unknown: 0,
      credit: 0,
    };
    for (const entry of entries) {
      const amounts = billBuckets(entry);
      for (const [key] of groups) totals[key] += amounts[key];
    }
    return {
      month,
      label: new Intl.DateTimeFormat("es-ES", {
        month: "short",
        timeZone: "UTC",
      }).format(new Date(`${month}-01`)),
      amount: entries.reduce((sum, b) => sum + numberOf(b.paid), 0),
      count: entries.length,
      totals,
    };
  });
  const total = months.reduce((sum, m) => sum + m.amount, 0);
  function create() {
    const current = w.tariffs.find((t) => t.id === w.currentId);
    setEditing({
      id: crypto.randomUUID(),
      month: today().slice(0, 7),
      provider: current?.provider || current?.name || "",
      periodStart: "",
      periodEnd: "",
      paid: "",
      credit: "0",
      kwh: "",
      consumption: null,
      notes: "",
      tariff: current ? structuredClone(current) : null,
      profile: null,
      breakdown: null,
    });
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">LO QUE REALMENTE HAS PAGADO</span>
          <h2>Tus facturas, con perspectiva.</h2>
          <p className="muted">
            Lo que pagas y consumes, mes a mes o año a año.
          </p>
        </div>
        <button className="button primary" onClick={create}>
          <Plus size={17} />
          Añadir factura
        </button>
      </div>
      <div className="bill-views" role="group" aria-label="Vista de facturas">
        <button
          type="button"
          aria-pressed={!showYears}
          onClick={() => setView("months")}
        >
          Mes a mes
        </button>
        {hasMultipleYears && (
          <button
            type="button"
            aria-pressed={showYears}
            onClick={() => setView("years")}
          >
            Por años
          </button>
        )}
        <span className="small muted">
          {showYears
            ? "Compara dos años de facturas"
            : "Tu registro de facturas"}
        </span>
      </div>
      {showYears ? (
        <YearComparison bills={w.bills} />
      ) : (
        <>
          <div className="panel bill-chart">
            <div className="section-inline">
              <div>
                <span className="muted">
                  {chartView === "consumption"
                    ? "Consumo registrado"
                    : "Pagado"}{" "}
                  en {year}
                </span>
                <div className="big-amount">
                  {chartView === "consumption"
                    ? recordedConsumption
                      ? formatKwh(knownKwh)
                      : "— kWh"
                    : money(total)}
                </div>
                <span className="small muted">
                  {bills.length} facturas ·{" "}
                  {months.filter((m) => m.count).length} meses con datos
                  {chartView === "consumption" &&
                    ` · ${recordedConsumption}/${bills.length} facturas con kWh`}
                </span>
              </div>
              <label className="inline-label">
                Año
                <select value={year} onChange={(e) => setYear(e.target.value)}>
                  {Array.from(
                    new Set([
                      today().slice(0, 4),
                      ...w.bills.map((b) => b.month.slice(0, 4)),
                    ]),
                  )
                    .sort()
                    .reverse()
                    .map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                </select>
              </label>
            </div>
            <BillsChart
              months={months}
              year={year}
              consumption={consumption}
              view={chartView}
              onViewChange={setChartView}
            />
            {chartView !== "consumption" && (
              <>
                <p className="small muted">
                  Cada factura se agrupa en el mes elegido (por defecto, el mes
                  de fin del período), sin prorratearla. Otros cargos: bono
                  social, SNOEE, alquiler y servicios. Las facturas antiguas sin
                  conceptos aparecen como «Sin desglose»; los meses sin
                  facturas, como «—». Los créditos se restan del total y
                  aparecen bajo el cero en las barras.
                </p>
                <details className="form-section">
                  <summary>Ver desglose mensual en tabla</summary>
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Desglose mensual"
                  >
                    <table>
                      <caption className="bill-table-caption">
                        Total antes de créditos · Pagado después de créditos.
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Mes</th>
                          {groups.map(([key, label]) => (
                            <th scope="col" key={key}>
                              {label}
                            </th>
                          ))}
                          <th scope="col">Total</th>
                          <th scope="col">Pagado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {months.map((m) => (
                          <tr key={m.month}>
                            <th scope="row">{m.label}</th>
                            {groups.map(([key]) => (
                              <td key={key}>
                                {m.count ? money(m.totals[key]) : "—"}
                              </td>
                            ))}
                            <td>
                              {m.count
                                ? money(m.amount - m.totals.credit)
                                : "—"}
                            </td>
                            <td>{m.count ? money(m.amount) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
          </div>
          {!bills.length ? (
            <div className="panel">
              <Empty
                icon={<Receipt size={26} />}
                title="Tu historial empieza con una factura."
                action={
                  <button className="button secondary" onClick={create}>
                    Registrar mi primera factura
                  </button>
                }
              >
                Añade el importe real o guarda tu cálculo como factura desde el
                comparador.
              </Empty>
            </div>
          ) : (
            <div
              className="panel table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Facturas registradas"
            >
              <table>
                <caption className="bill-table-caption">
                  Total antes de créditos · Pagado después de créditos.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Período</th>
                    <th scope="col">Comercializadora</th>
                    <th scope="col">Consumo</th>
                    <th scope="col">Total</th>
                    <th scope="col">Créditos</th>
                    <th scope="col">Pagado</th>
                    <th scope="col">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id}>
                      <td>
                        {billMonthLabel(b.month)}
                        {b.periodStart && b.periodEnd && (
                          <small className="block muted">
                            {shortDate(b.periodStart)} –{" "}
                            {shortDate(b.periodEnd)}
                          </small>
                        )}
                      </td>
                      <td>
                        <strong>{b.provider}</strong>
                        {b.tariff && (
                          <small className="block muted">{b.tariff.name}</small>
                        )}
                        {b.notes && (
                          <small className="block muted">{b.notes}</small>
                        )}
                        {b.breakdown && (
                          <details>
                            <summary>Ver conceptos</summary>
                            <dl className="bill-breakdown">
                              {billLines.map(([key, label]) => (
                                <div key={key}>
                                  <dt>{label}</dt>
                                  <dd>{money(numberOf(b.breakdown![key]))}</dd>
                                </div>
                              ))}
                            </dl>
                          </details>
                        )}
                      </td>
                      <td>
                        {b.kwh || "—"} {b.kwh && "kWh"}
                      </td>
                      <td className="amount">{money(billTotal(b))}</td>
                      <td className="amount">
                        {numberOf(b.credit) ? money(-numberOf(b.credit)) : "—"}
                      </td>
                      <td className="amount">{money(numberOf(b.paid))}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={`Editar factura ${b.month}`}
                            onClick={() => setEditing(b)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label={`Eliminar factura ${b.month}`}
                            onClick={() => {
                              if (window.confirm("¿Eliminar esta factura?"))
                                update({
                                  ...w,
                                  bills: w.bills.filter((x) => x.id !== b.id),
                                });
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {editing && (
        <BillForm
          initial={editing}
          workspace={w}
          onClose={() => setEditing(null)}
          onSave={async (bill, newTariff) => {
            update({
              ...w,
              tariffs: newTariff ? [...w.tariffs, newTariff] : w.tariffs,
              bills: [...w.bills.filter((b) => b.id !== bill.id), bill],
            });
            setYear(bill.month.slice(0, 4));
            setView("months");
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
