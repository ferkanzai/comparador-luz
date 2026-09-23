import { Pencil, Trash2 } from "lucide-react";
import { money, numberOf, shortDate, type Bill } from "@/lib/domain";
import { billLines, billMonthLabel, billTotal } from "@/lib/bill-data";

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
        <small className="block muted">
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
      {bill.tariff && <small className="block muted">{bill.tariff.name}</small>}
      {bill.notes && <small className="block muted">{bill.notes}</small>}
      {bill.breakdown && (
        <details>
          <summary>Ver conceptos</summary>
          <dl className="bill-breakdown">
            {billLines.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{money(numberOf(bill.breakdown![key]))}</dd>
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
    <div className="row-actions">
      <button
        className="icon-button"
        aria-label={`Editar factura ${bill.month}`}
        onClick={() => onEdit(bill)}
      >
        <Pencil size={16} />
      </button>
      <button
        className="icon-button danger"
        aria-label={`Eliminar factura ${bill.month}`}
        onClick={() => onRemove(bill)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

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
        className="panel table-scroll bill-table"
        tabIndex={0}
        role="region"
        aria-label="Facturas registradas"
      >
        <table>
          <caption className="bill-table-caption">
            Total antes de descuentos · Pagado después de descuentos.
          </caption>
          <thead>
            <tr>
              <th scope="col">Período</th>
              <th scope="col">Comercializadora</th>
              <th scope="col">Consumo</th>
              <th scope="col">Total</th>
              <th scope="col">Descuentos</th>
              <th scope="col">Pagado</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => {
              const props = { bill, onEdit, onRemove };
              return (
                <tr key={bill.id}>
                  <td>
                    <BillPeriod {...props} />
                  </td>
                  <td>
                    <BillSource {...props} />
                  </td>
                  <td>{consumption(bill)}</td>
                  <td className="amount">{money(billTotal(bill))}</td>
                  <td className="amount">{credit(bill)}</td>
                  <td className="amount">{money(numberOf(bill.paid))}</td>
                  <td>
                    <BillActions {...props} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ol className="bill-cards" aria-label="Facturas registradas">
        {bills.map((bill) => {
          const props = { bill, onEdit, onRemove };
          return (
            <li key={bill.id}>
              <article
                className="bill-card"
                aria-label={`Factura de ${billMonthLabel(bill.month)}`}
              >
                <div className="bill-card-head">
                  <div className="bill-card-period">
                    <BillPeriod {...props} />
                  </div>
                  <BillActions {...props} />
                </div>
                <div>
                  <BillSource {...props} />
                </div>
                <dl className="bill-card-amounts">
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
                  <div className="bill-card-paid">
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
