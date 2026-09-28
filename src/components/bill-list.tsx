import { useId, useState } from "react";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { money, numberOf, shortDate, type Bill } from "@/lib/domain";
import { billLines, billMonthLabel, billTotal } from "@/lib/bill-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CostCategoryLabel, { billLineCategories } from "./cost-category-label";
import {
  bodyCell,
  headCell,
  panel,
  subLine,
  table,
  tableCaption,
  tableScroll,
} from "./bill-styles";

type BillProps = {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onRemove: (bill: Bill) => void;
};

function BillPeriod({ bill }: Pick<BillProps, "bill">) {
  const days =
    bill.periodStart && bill.periodEnd
      ? (Date.parse(bill.periodEnd) - Date.parse(bill.periodStart)) / 86400000
      : null;
  return (
    <>
      {billMonthLabel(bill.month)}
      {bill.periodStart && bill.periodEnd && (
        <small className={cn(subLine, "font-normal normal-case")}>
          {shortDate(bill.periodStart)} – {shortDate(bill.periodEnd)}
          {days !== null && days > 0 && (
            <span className="block">
              {days} {days === 1 ? "día" : "días"}
            </span>
          )}
        </small>
      )}
    </>
  );
}

function BillSource({ bill }: Pick<BillProps, "bill">) {
  return (
    <>
      <strong>{bill.provider}</strong>
      {bill.tariff && <small className={subLine}>{bill.tariff.name}</small>}
      {bill.notes && <small className={subLine}>{bill.notes}</small>}
    </>
  );
}

const breakdownGroups = [
  { title: "Energía y potencia", categories: ["energy", "power"] },
  { title: "Otros cargos", categories: ["other"] },
  { title: "Impuestos", categories: ["taxes"] },
];

function BillBreakdown({ bill }: Pick<BillProps, "bill">) {
  const breakdown = bill.breakdown;
  if (!breakdown) return null;

  return (
    <div className="grid gap-6 min-[761px]:grid-cols-3 min-[761px]:gap-8">
      {breakdownGroups.map(({ title, categories }) => (
        <section key={title} className="min-w-0">
          <h3 className="m-0 border-b border-border pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {title}
          </h3>
          <dl className="m-0 mt-2 grid gap-1">
            {billLines
              .filter(([key]) => categories.includes(billLineCategories[key]))
              .map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-baseline justify-between gap-3 py-1.5 text-sm/[1.6]"
                >
                  <dt>
                    <CostCategoryLabel category={billLineCategories[key]}>
                      {label}
                    </CostCategoryLabel>
                  </dt>
                  <dd className="m-0 shrink-0 whitespace-nowrap font-medium tabular-nums">
                    {money(numberOf(breakdown[key]))}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function BillActions({ bill, onEdit, onRemove }: BillProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"

        aria-label={`Editar factura ${bill.month}`}
        onClick={() => onEdit(bill)}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-destructive-muted hover:text-destructive"

        aria-label={`Eliminar factura ${bill.month}`}
        onClick={() => onRemove(bill)}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}

const amount = "font-semibold tabular-nums";
const consumption = (bill: Bill) => (bill.kwh ? `${bill.kwh} kWh` : "—");
const credit = (bill: Bill) =>
  numberOf(bill.credit) ? money(-numberOf(bill.credit)) : "—";

function BillRow(props: BillProps) {
  const { bill } = props;
  const [expanded, setExpanded] = useState(false);
  const breakdownId = useId();
  const cell = cn(bodyCell, "align-top", expanded && "border-b-0");

  return (
    <>
      <tr>
        <td className={cell}>
          <BillPeriod bill={bill} />
        </td>
        <td className={cell}>
          <BillSource bill={bill} />
          {bill.breakdown && (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 mt-1"
              aria-expanded={expanded}
              aria-controls={breakdownId}
              onClick={() => setExpanded((value) => !value)}
            >
              <ChevronDown
                data-icon="inline-start"
                className={cn(
                  "transition-transform motion-reduce:transition-none",
                  expanded && "rotate-180",
                )}
              />
              {expanded ? "Ocultar conceptos" : "Ver conceptos"}
            </Button>
          )}
        </td>
        <td className={cn(cell, "whitespace-nowrap")}>{consumption(bill)}</td>
        <td className={cn(cell, amount, "whitespace-nowrap")}>
          {money(billTotal(bill))}
        </td>
        <td className={cn(cell, amount, "whitespace-nowrap")}>
          {credit(bill)}
        </td>
        <td className={cn(cell, amount, "whitespace-nowrap")}>
          {money(numberOf(bill.paid))}
        </td>
        <td className={cell}>
          <BillActions {...props} />
        </td>
      </tr>
      {bill.breakdown && (
        <tr hidden={!expanded}>
          <td
            colSpan={7}
            className="border-b border-border px-5 pb-5 [tr:last-child>&]:border-b-0"
          >
            <div
              id={breakdownId}
              className="rounded-lg border border-border bg-background p-5"
            >
              <BillBreakdown bill={bill} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function BillList({
  bills,
  onEdit,
  onRemove,
}: {
  bills: Bill[];
  onEdit: (bill: Bill) => void;
  onRemove: (bill: Bill) => void;
}) {
  return (
    <>
      <div
        className={cn(panel, tableScroll, "max-[760px]:hidden")}
        tabIndex={0}
        role="region"
        aria-label="Facturas registradas"
      >
        <table className={table}>
          <caption className={tableCaption}>
            Total antes de descuentos · Pagado después de descuentos.
          </caption>
          <thead>
            <tr>
              <th className={headCell} scope="col">
                Período
              </th>
              <th className={headCell} scope="col">
                Comercializadora
              </th>
              <th className={headCell} scope="col">
                Consumo
              </th>
              <th className={headCell} scope="col">
                Total
              </th>
              <th className={headCell} scope="col">
                Descuentos
              </th>
              <th className={headCell} scope="col">
                Pagado
              </th>
              <th className={headCell} scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ol
        className="m-0 hidden list-none gap-3 p-0 max-[760px]:grid"
        aria-label="Facturas registradas"
      >
        {bills.map((bill) => {
          const props = { bill, onEdit, onRemove };
          return (
            <li key={bill.id}>
              <article
                className="grid gap-2.5 rounded-lg border border-border bg-card p-4"
                aria-label={`Factura de ${billMonthLabel(bill.month)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-[650]">
                    <BillPeriod {...props} />
                  </div>
                  <BillActions {...props} />
                </div>
                <div>
                  <BillSource {...props} />
                </div>
                <dl className="m-0 grid gap-1.5 border-t border-border pt-2.5 text-sm/[1.6] *:flex *:justify-between *:gap-3 [&_dd]:m-0 [&_dd]:tabular-nums">
                  <div>
                    <dt>Consumo</dt>
                    <dd>{consumption(bill)}</dd>
                  </div>
                  <div>
                    <dt>Total antes de descuentos</dt>
                    <dd>{money(billTotal(bill))}</dd>
                  </div>
                  <div>
                    <dt>Descuentos</dt>
                    <dd>{credit(bill)}</dd>
                  </div>
                  <div className="font-bold">
                    <dt>Pagado</dt>
                    <dd>{money(numberOf(bill.paid))}</dd>
                  </div>
                </dl>
                {bill.breakdown && (
                  <details className="group border-t border-border">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                      <span className="group-open:hidden">Ver conceptos</span>
                      <span className="hidden group-open:inline">
                        Ocultar conceptos
                      </span>
                    </summary>
                    <div className="pb-1 pt-3">
                      <BillBreakdown bill={bill} />
                    </div>
                  </details>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </>
  );
}
