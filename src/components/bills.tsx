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
import { cn } from "@/lib/utils";
import { formDisclosure, tallSelect } from "./tariff-form-sections";
import {
  bodyCell,
  chartNote,
  headCell,
  panel,
  table,
  tableCaption,
  tableScroll,
} from "./bill-styles";
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
      <div className="mb-5 flex items-center justify-between gap-5 max-[520px]:flex-col max-[520px]:items-start">
        <div>
          <span className="text-sm/[1.6] font-semibold tracking-[1.65px]">
            LO QUE REALMENTE HAS PAGADO
          </span>
          <h2 className="m-0 mt-1.5 font-heading text-2xl/[1.6] font-bold tracking-[-0.55px]">
            Tus facturas, con perspectiva.
          </h2>
          <p className="m-0 text-muted-foreground max-[520px]:mt-2 max-[520px]:text-sm-plus">
            Lo que pagas y consumes, mes a mes o año a año.
          </p>
        </div>
        <Button onClick={create}>
          <Plus size={17} />
          Añadir factura
        </Button>
      </div>
      <div
        className="mb-6 flex items-center gap-6 border-b border-border [&>button]:relative [&>button]:px-0.5 [&>button]:py-3.5 [&>button]:font-semibold [&>button]:text-muted-foreground [&>button]:aria-pressed:text-foreground [&>button]:aria-pressed:after:absolute [&>button]:aria-pressed:after:inset-x-0 [&>button]:aria-pressed:after:-bottom-px [&>button]:aria-pressed:after:h-[3px] [&>button]:aria-pressed:after:rounded-t-sm [&>button]:aria-pressed:after:bg-primary"
        role="group"
        aria-label="Vista de facturas"
      >
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
        <span className="ml-auto text-sm-plus text-muted-foreground max-[600px]:hidden">
          {showYears
            ? "Compara dos años de facturas"
            : "Tu registro de facturas"}
        </span>
      </div>
      {showYears ? (
        <YearComparison bills={w.bills} />
      ) : (
        <>
          <div
            className={cn(panel, "mb-6 p-6 max-[520px]:px-4 max-[520px]:py-5")}
          >
            <div className="flex items-center justify-between gap-3 max-[520px]:flex-wrap max-[520px]:items-start">
              <div>
                <span className="text-muted-foreground max-[520px]:text-sm/[1.6]">
                  {chartView === "consumption"
                    ? "Consumo registrado"
                    : "Pagado"}{" "}
                  en {year}
                </span>
                <div className="my-px font-heading text-4xl/[1.6] font-semibold tracking-[-1.5px] max-[520px]:text-3xl/[1.6]">
                  {chartView === "consumption"
                    ? recordedConsumption
                      ? formatKwh(knownKwh)
                      : "— kWh"
                    : money(total)}
                </div>
                <span className={chartNote}>
                  {bills.length} facturas ·{" "}
                  {months.filter((m) => m.count).length} meses con datos
                  {chartView === "consumption" &&
                    ` · ${recordedConsumption}/${bills.length} facturas con kWh`}
                </span>
              </div>
              <label className="flex items-center gap-2 text-sm/[1.6] text-muted-foreground">
                Año
                <NativeSelect
                  className={tallSelect}
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
                <p className={chartNote}>
                  Cada factura se agrupa en el mes elegido (por defecto, el mes
                  de fin del período), sin prorratearla. Otros cargos: bono
                  social, SNOEE, alquiler y servicios. Las facturas antiguas sin
                  conceptos aparecen como «Sin desglose»; los meses sin
                  facturas, como «—». Los descuentos se restan del total y
                  aparecen bajo el cero en las barras.
                </p>
                <details className={formDisclosure}>
                  <summary>Ver desglose mensual en tabla</summary>
                  <div
                    className={tableScroll}
                    tabIndex={0}
                    role="region"
                    aria-label="Desglose mensual"
                  >
                    <table className={table}>
                      <caption className={tableCaption}>
                        Total antes de descuentos · Pagado después de
                        descuentos.
                      </caption>
                      <thead>
                        <tr>
                          <th className={headCell} scope="col">
                            Mes
                          </th>
                          {groups.map(([key, label]) => (
                            <th className={headCell} scope="col" key={key}>
                              {label}
                            </th>
                          ))}
                          <th className={headCell} scope="col">
                            Total
                          </th>
                          <th className={headCell} scope="col">
                            Pagado
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {months.map((m) => (
                          <tr key={m.month}>
                            <th className={headCell} scope="row">
                              {m.label}
                            </th>
                            {groups.map(([key]) => (
                              <td key={key} className={bodyCell}>
                                {m.count ? money(m.totals[key]) : "—"}
                              </td>
                            ))}
                            <td className={bodyCell}>
                              {m.count
                                ? money(m.amount - m.totals.credit)
                                : "—"}
                            </td>
                            <td className={bodyCell}>
                              {m.count ? money(m.amount) : "—"}
                            </td>
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
            <div className={panel}>
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
              <p className="text-muted-foreground">
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
              <p className="text-muted-foreground">
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
