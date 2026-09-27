import { Pencil, Trash2 } from "lucide-react";
import { money, numberOf, shortDate, type Bill } from "@/lib/domain";
import { billLines, billMonthLabel, billTotal } from "@/lib/bill-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

function BillPeriod({ bill }: BillProps) {
  return (
    <>
      {billMonthLabel(bill.month)}
      {bill.periodStart && bill.periodEnd && (
        <small className={cn(subLine, "font-normal")}>
          {shortDate(bill.periodStart)} – {shortDate(bill.periodEnd)}
        </small>
      )}
    </>
  );
}

function BillSource({ bill }: BillProps) {
  return (
    <>
      <strong>{bill.provider}</strong>
      {bill.tariff && <small className={subLine}>{bill.tariff.name}</small>}
      {bill.notes && <small className={subLine}>{bill.notes}</small>}
      {bill.breakdown && (
        <details>
          <summary className="min-h-11 content-center">Ver conceptos</summary>
          <dl className="my-4">
            {billLines.map(([key, label]) => (
              <div key={key} className="my-2 flex justify-between gap-4">
                <dt>{label}</dt>
                <dd className="m-0 whitespace-nowrap tabular-nums">
                  {money(numberOf(bill.breakdown![key]))}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </>
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
            {bills.map((bill) => {
              const props = { bill, onEdit, onRemove };
              return (
                <tr key={bill.id}>
                  <td className={bodyCell}>
                    <BillPeriod {...props} />
                  </td>
                  <td className={bodyCell}>
                    <BillSource {...props} />
                  </td>
                  <td className={bodyCell}>{consumption(bill)}</td>
                  <td className={cn(bodyCell, amount)}>
                    {money(billTotal(bill))}
                  </td>
                  <td className={cn(bodyCell, amount)}>{credit(bill)}</td>
                  <td className={cn(bodyCell, amount)}>
                    {money(numberOf(bill.paid))}
                  </td>
                  <td className={bodyCell}>
                    <BillActions {...props} />
                  </td>
                </tr>
              );
            })}
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
              </article>
            </li>
          );
        })}
      </ol>
    </>
  );
}
