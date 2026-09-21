"use client";
import { type Bill } from "@/lib/domain";
import {
  consumptionTotal,
  formatKwh,
  updateBillConsumption,
} from "@/lib/bill-consumption";
import { Field } from "./ui";

export default function BillConsumptionFields({
  bill,
  onChange,
}: {
  bill: Bill;
  onChange: (bill: Bill) => void;
}) {
  return (
    <section
      className="form-section bill-consumption-fields"
      aria-label="Consumo de la factura"
    >
      <h3>Consumo de esta factura</h3>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={!!bill.consumption}
          onChange={(e) =>
            onChange(
              updateBillConsumption(
                bill,
                e.target.checked
                  ? { peakKwh: "", flatKwh: "", valleyKwh: "" }
                  : null,
              ),
            )
          }
        />
        Tengo el consumo por periodos
      </label>
      {bill.consumption ? (
        <>
          <div className="form-grid three">
            {(
              [
                ["peakKwh", "Consumo P1 · Punta"],
                ["flatKwh", "Consumo P2 · Llano"],
                ["valleyKwh", "Consumo P3 · Valle"],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={bill.consumption![key]}
                onChange={(value) =>
                  onChange(
                    updateBillConsumption(bill, {
                      ...bill.consumption!,
                      [key]: value,
                    }),
                  )
                }
                decimal
                unit="kWh"
              />
            ))}
          </div>
          <p className="small" role="status">
            Total de los periodos:{" "}
            <strong>
              {consumptionTotal(bill.consumption) === null
                ? "Pendiente"
                : formatKwh(consumptionTotal(bill.consumption)!)}
            </strong>
          </p>
          <p className="small muted">
            Sumamos los tres periodos automáticamente. Usa 0 cuando no haya
            consumo; deja desactivado el reparto si solo conoces el total.
          </p>
        </>
      ) : (
        <Field
          label="Consumo total (opcional)"
          decimal
          unit="kWh"
          value={bill.kwh}
          onChange={(kwh) => onChange({ ...bill, kwh, consumption: null })}
        />
      )}
    </section>
  );
}
