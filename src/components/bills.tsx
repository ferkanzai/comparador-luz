"use client";
import { useState } from "react";
import { Plus, Receipt } from "lucide-react";
import {
  money,
  today,
  numberOf,
  shortMonthLabel,
  type Bill,
  type Workspace,
} from "@/lib/domain";
import {
  billBuckets,
  billGroups as groups,
  billMonthLabel,
  billTotal,
} from "@/lib/bill-data";
import { Empty } from "./ui";
import BillForm from "./bill-form";
import ConfirmDialog from "./confirm-dialog";
import BillsChart from "./bills-chart";
import BillList from "./bill-list";
import YearComparison from "./year-comparison";
import { invoiceYears } from "@/lib/year-comparison";
import { consumptionMonths, formatKwh } from "@/lib/bill-consumption";
import { commands, type WorkspaceCommand } from "@/lib/workspace-commands";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
export default function Bills({
  workspace: w,
  run,
}: {
  workspace: Workspace;
  run: (command: WorkspaceCommand) => void;
}) {
  const [editing, setEditing] = useState<Bill | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const removing = w.bills.find((b) => b.id === removingId);
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
      label: shortMonthLabel(month),
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
        <Button onClick={create}>
          <Plus size={17} />
          Añadir factura
        </Button>
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
                <NativeSelect
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  {Array.from(
                    new Set([
                      today().slice(0, 4),
                      ...w.bills.map((b) => b.month.slice(0, 4)),
                    ]),
                  )
                    .sort()
                    .reverse()
                    .map((y) => (
                      <NativeSelectOption key={y}>{y}</NativeSelectOption>
                    ))}
                </NativeSelect>
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
                  facturas, como «—». Los descuentos se restan del total y
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
                        Total antes de descuentos · Pagado después de
                        descuentos.
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
                  <Button variant="outline" onClick={create}>
                    Registrar mi primera factura
                  </Button>
                }
              >
                Añade el importe real o guarda tu cálculo como factura desde el
                comparador.
              </Empty>
            </div>
          ) : (
            <BillList
              bills={bills}
              onEdit={setEditing}
              onRemove={(bill) => setRemovingId(bill.id)}
            />
          )}
        </>
      )}
      {removing && (
        <ConfirmDialog
          title="Eliminar factura"
          summary={
            <>
              <p className="muted">
                {removing.provider} · {money(billTotal(removing))}
              </p>
              <h3>{billMonthLabel(removing.month)}</h3>
            </>
          }
          consequence={
            <>
              <p>
                Esta factura se eliminará de Mis facturas y de sus gráficos.
              </p>
              <p className="muted">
                Tus tarifas, tu historial de contratos y el resto de facturas se
                conservan.
              </p>
            </>
          }
          confirmLabel="Eliminar factura"
          onConfirm={() => {
            run(commands.removeBill(removing.id));
            setRemovingId(null);
          }}
          onClose={() => setRemovingId(null)}
        />
      )}
      {editing && (
        <BillForm
          initial={editing}
          workspace={w}
          onClose={() => setEditing(null)}
          onSave={async (bill, newTariff) => {
            run(commands.saveBill(bill, newTariff));
            setYear(bill.month.slice(0, 4));
            setView("months");
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
