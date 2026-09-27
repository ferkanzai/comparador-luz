"use client";
import { type Bill } from "@/lib/domain";
import {
  consumptionTotal,
  formatKwh,
  updateBillConsumption,
} from "@/lib/bill-consumption";
import { Field } from "./ui";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  checkboxLabel,
  formSection,
  sectionNote,
  sectionTitle,
  three,
} from "./tariff-form-sections";

export default function BillConsumptionFields({
  bill,
  onChange,
}: {
  bill: Bill;
  onChange: (bill: Bill) => void;
}) {
  return (
    <section className={formSection} aria-label="Consumo de la factura">
      <h3 className={cn(sectionTitle, "mb-3")}>Consumo de esta factura</h3>
      <label className={checkboxLabel}>
        <Checkbox
          checked={!!bill.consumption}
          onCheckedChange={(checked) =>
            onChange(
              updateBillConsumption(
                bill,
                checked === true
                  ? { peakKwh: "", flatKwh: "", valleyKwh: "" }
                  : null,
              ),
            )
          }
        />
        Tengo el consumo por períodos
      </label>
      {bill.consumption ? (
        <>
          <div className={cn(three, "mt-4")}>
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
          <p className={cn(sectionNote, "text-foreground")} role="status">
            Total de los períodos:{" "}
            <strong>
              {consumptionTotal(bill.consumption) === null
                ? "Pendiente"
                : formatKwh(consumptionTotal(bill.consumption)!)}
            </strong>
          </p>
          <p className={sectionNote}>
            Sumamos los tres períodos automáticamente. Usa 0 cuando no haya
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
