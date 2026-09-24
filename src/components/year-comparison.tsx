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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { chartScroll } from "./chart-scroll";
import { formDisclosure, tallSelect } from "./tariff-form-sections";
import {
  bodyCell,
  chartAxisWidth,
  chartLegend,
  monthButtons,
  headCell,
  monthName,
  note,
  panel,
  swatch,
  table,
  tableCaption,
  tableScroll,
} from "./bill-styles";

// Recharts downloads only when the chart is on screen.
const YearBars = dynamic(
  () => import("./monthly-charts").then((m) => m.YearBars),
  { ssr: false },
);

const firstYear = "bg-period-2";
const secondYear = "bg-primary";
const yearCell = cn(bodyCell, "whitespace-nowrap");
const yearSelect = "m-0 block text-sm-plus font-medium";

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
  const description =
    metric === "paid"
      ? "Importe pagado después de descuentos"
      : "Consumo registrado en kWh";
  return (
    <section aria-label="Comparación de facturas por años">
      <div className={cn(panel, "p-7 max-[640px]:px-3.5 max-[640px]:py-5")}>
        <div className="flex flex-wrap items-end justify-between gap-6 max-[640px]:items-stretch max-[640px]:gap-4">
          <div className="grid max-w-[500px] flex-1 grid-cols-2 gap-3.5 max-[1000px]:gap-2.5 max-[640px]:min-w-full max-[640px]:gap-3">
            <label className={yearSelect}>
              Año de referencia
              <NativeSelect
                className={tallSelect}
                value={first}
                onChange={(event) =>
                  setSelection({
                    first: event.target.value,
                    second: event.target.value === second ? first : second,
                  })
                }
              >
                {years.map((year) => (
                  <NativeSelectOption key={year}>{year}</NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label className={yearSelect}>
              Año a comparar
              <NativeSelect
                className={tallSelect}
                value={second}
                onChange={(event) =>
                  setSelection({
                    first: event.target.value === first ? second : first,
                    second: event.target.value,
                  })
                }
              >
                {years.map((year) => (
                  <NativeSelectOption key={year}>{year}</NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          </div>
          <ToggleGroup
            type="single"
            value={metric}
            className="rounded-lg bg-muted p-1 *:data-[state=on]:bg-card *:data-[state=on]:shadow-sm max-[640px]:*:flex-1"
            aria-label="Dato a comparar"
          >
            <ToggleGroupItem value="paid" onClick={() => setMetric("paid")}>
              <Receipt size={16} aria-hidden="true" />
              Pagado
            </ToggleGroupItem>
            <ToggleGroupItem
              value="consumption"
              onClick={() => setMetric("consumption")}
            >
              <Zap size={16} aria-hidden="true" />
              Consumo
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div
          className="mt-7 flex flex-wrap justify-between gap-6 rounded-lg border border-border bg-background p-6 max-[640px]:p-5"
          role="status"
          aria-live="polite"
        >
          <div className="grid gap-2">
            <span className="text-sm/[1.6] font-semibold tracking-[1.65px]">
              {comparison.commonMonths}{" "}
              {comparison.commonMonths === 1
                ? "MES COMPARABLE"
                : "MESES COMPARABLES"}
            </span>
            <strong className="my-px font-heading text-4xl/[1.2] font-semibold tracking-[-1.5px] max-[640px]:text-3xl/[1.2] max-[640px]:wrap-anywhere">
              {comparison.commonMonths ? signed(comparison.difference) : "—"}
            </strong>
            <span>
              {comparison.commonMonths
                ? `${second} respecto a ${first}${comparison.percent !== null ? ` · ${comparison.percent > 0 ? "+" : ""}${comparison.percent.toLocaleString("es-ES", { maximumFractionDigits: 1 })} %` : ""}`
                : "Aún no hay meses con datos comparables en ambos años."}
            </span>
          </div>
          <dl className="m-0 flex items-center gap-9 [&_dd]:m-0 [&_dd]:mt-2 [&_dd]:font-bold [&_dd]:tabular-nums [&_dt]:flex [&_dt]:items-center [&_dt]:gap-2 [&_dt]:text-muted-foreground">
            <div>
              <dt>
                <span className={cn(swatch, firstYear)} />
                {first}
              </dt>
              <dd>
                {comparison.commonMonths ? format(comparison.firstTotal) : "—"}
              </dd>
            </div>
            <div>
              <dt>
                <span className={cn(swatch, secondYear)} />
                {second}
              </dt>
              <dd>
                {comparison.commonMonths ? format(comparison.secondTotal) : "—"}
              </dd>
            </div>
          </dl>
        </div>
        <p className={note}>
          La diferencia usa solo los mismos meses con registros en ambos años
          {metric === "consumption" ? " y kWh en todas sus facturas" : ""}. No
          extrapolamos el año completo ni interpretamos la diferencia como
          ahorro de tarifa.
        </p>
        <div className="mt-7 flex items-center justify-between gap-4">
          <h3 className="m-0 flex items-center gap-2 font-heading text-lg/[1.6] font-bold tracking-[-0.25px]">
            <BarChart3 size={18} aria-hidden="true" />
            Mes a mes
          </h3>
          <ul className={cn(chartLegend, "m-0")} aria-label="Años del gráfico">
            <li>
              <span className={cn(swatch, firstYear)} />
              {first}
            </li>
            <li>
              <span className={cn(swatch, secondYear)} />
              {second}
            </li>
          </ul>
        </div>
        <p className={note}>
          {description}. «—» indica datos desconocidos
          {metric === "consumption"
            ? "; * marca un consumo parcial, excluido de la diferencia"
            : ""}
          . Desliza el gráfico para ver todos los meses.
        </p>
        <div
          className={chartScroll}
          tabIndex={0}
          role="region"
          aria-label={`${description}: ${first} y ${second}`}
        >
          <div
            className="relative h-[260px] min-w-[1200px]"
            role="img"
            aria-label={`Comparación mensual de ${first} y ${second}. Valores disponibles en la tabla de debajo.`}
          >
            <div className="absolute inset-0">
              <YearBars
                rows={comparison.rows.map((row) => ({
                  label: row.label,
                  first: row.first.value,
                  second: row.second.value,
                }))}
                metric={metric}
              />
            </div>
            <div className={monthButtons} style={{ left: chartAxisWidth }}>
              {comparison.rows.map((row) => (
                <div
                  key={row.label}
                  className="relative text-center text-xs-plus"
                >
                  <div className="absolute inset-x-0 top-0 grid gap-1">
                    {[row.first, row.second].map((entry, i) => (
                      <span
                        key={i}
                        className={
                          i
                            ? "font-semibold text-primary-hover"
                            : "text-brand-leaf"
                        }
                      >
                        {entry.value === null ? "—" : format(entry.value)}
                        {entry.value !== null && entry.missing > 0 ? " *" : ""}
                      </span>
                    ))}
                  </div>
                  <span className={monthName}>{row.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <details className={formDisclosure}>
          <summary>Ver comparación mensual en tabla</summary>
          <div
            className={tableScroll}
            tabIndex={0}
            role="region"
            aria-label="Tabla de comparación anual"
          >
            <table className={cn(table, "min-w-[640px]")}>
              <caption className={tableCaption}>
                {description} · Diferencia = {second} − {first}. Solo comparamos
                meses con datos suficientes.
              </caption>
              <thead>
                <tr>
                  <th className={headCell} scope="col">
                    Mes
                  </th>
                  <th className={headCell} scope="col">
                    {first}
                  </th>
                  <th className={headCell} scope="col">
                    {second}
                  </th>
                  <th className={headCell} scope="col">
                    Diferencia
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr key={row.label}>
                    <th className={headCell} scope="row">
                      {row.label}
                    </th>
                    {[row.first, row.second].map((entry, i) => (
                      <td key={i} className={yearCell}>
                        {entry.value === null ? "—" : format(entry.value)}
                        <small className="block max-w-[250px] min-w-[130px] text-sm/[1.6] whitespace-normal wrap-normal text-muted-foreground">
                          {entry.count}{" "}
                          {entry.count === 1 ? "factura" : "facturas"}
                          {entry.missing
                            ? ` · ${entry.missing} sin kWh${entry.value !== null ? " · parcial" : ""}`
                            : ""}
                        </small>
                      </td>
                    ))}
                    <td className={yearCell}>
                      {row.difference === null ? "—" : signed(row.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-background font-bold">
                <tr>
                  <th className={headCell} scope="row">
                    Meses comparables ({comparison.commonMonths})
                  </th>
                  <td className={yearCell}>
                    {comparison.commonMonths
                      ? format(comparison.firstTotal)
                      : "—"}
                  </td>
                  <td className={yearCell}>
                    {comparison.commonMonths
                      ? format(comparison.secondTotal)
                      : "—"}
                  </td>
                  <td className={yearCell}>
                    {comparison.commonMonths
                      ? signed(comparison.difference)
                      : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </details>
        <p className={note}>
          Cada factura cuenta en su mes de registro, aunque abarque otras
          fechas. Un mes con facturas no garantiza que estén registradas todas
          las del período.
        </p>
      </div>
    </section>
  );
}
