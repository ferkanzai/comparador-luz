"use client";
import { Trash2 } from "lucide-react";
import {
  decimal,
  money,
  numberOf,
  type Bill,
  type BillPriceLine,
} from "@/lib/domain";
import { cents } from "@/lib/calculator";
import { replaceBillPriceLines } from "@/lib/bill-data";
import { Field } from "./ui";

const units = {
  day: { label: "Días", price: "€/día" },
  kwh: { label: "kWh", price: "€/kWh" },
  kwDay: { label: "kW × días", price: "€/kW/día" },
  kwMonth: { label: "kW × meses", price: "€/kW/mes" },
  kwYear: { label: "kW × años", price: "€/kW/año" },
  month: { label: "Meses", price: "€/mes" },
};

export default function BillPriceLines({
  bill,
  concept,
  label,
  onChange,
}: {
  bill: Bill;
  concept: BillPriceLine["concept"];
  label: string;
  onChange: (bill: Bill) => void;
}) {
  const lines = bill.priceLines.filter((line) => line.concept === concept);
  const replace = (next: BillPriceLine[]) =>
    onChange(replaceBillPriceLines(bill, concept, next));
  function update(id: string, patch: Partial<BillPriceLine>) {
    replace(
      lines.map((line) => {
        if (line.id !== id) return line;
        const next = { ...line, ...patch };
        if (
          ("quantity" in patch || "price" in patch) &&
          next.quantity !== "" &&
          next.price !== "" &&
          decimal().safeParse(next.quantity).success &&
          decimal(10000).safeParse(next.price).success
        )
          next.amount = String(
            cents(numberOf(next.quantity) * numberOf(next.price)),
          );
        return next;
      }),
    );
  }
  if (!lines.length) return null;
  return (
    <section
      className="bill-price-lines"
      aria-label={`Tramos de ${label.toLowerCase()}`}
    >
      <div className="section-inline">
        <h3>{label}</h3>
        <strong>
          {bill.breakdown?.[concept]
            ? money(numberOf(bill.breakdown[concept]))
            : "Suma pendiente"}
        </strong>
      </div>
      <p className="small muted">
        Copia cada línea de la factura. Cantidad × precio propone un importe;
        puedes corregirlo si el precio impreso está redondeado. Las fechas y el
        cálculo son opcionales si ya conoces el importe.
      </p>
      {lines.map((line, index) => (
        <details className="bill-price-line" key={line.id} open>
          <summary>
            Tramo {index + 1}
            {line.label ? ` · ${line.label}` : ""}
            <span>
              {line.amount && decimal().safeParse(line.amount).success
                ? money(numberOf(line.amount))
                : "Pendiente"}
            </span>
          </summary>
          <div className="price-line-body">
            <Field
              label="Detalle del tramo (opcional)"
              value={line.label}
              onChange={(label) => update(line.id, { label })}
              placeholder="Por ejemplo: P1 · antes del cambio"
              maxLength={100}
            />
            <div className="form-grid two">
              <Field
                label="Desde (opcional)"
                type="date"
                value={line.start}
                onChange={(start) => update(line.id, { start })}
              />
              <Field
                label="Hasta (no incluido)"
                type="date"
                value={line.end}
                onChange={(end) => update(line.id, { end })}
              />
            </div>
            <label className="auth-label">
              Unidad de la cantidad
              <select
                value={line.unit}
                onChange={(e) => {
                  const unit = e.target.value;
                  if (
                    unit === "day" ||
                    unit === "kwh" ||
                    unit === "kwDay" ||
                    unit === "kwMonth" ||
                    unit === "kwYear" ||
                    unit === "month"
                  )
                    update(line.id, { unit });
                }}
              >
                {Object.entries(units).map(([key, unit]) => (
                  <option key={key} value={key}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </label>
            {line.unit === "day" &&
              line.start &&
              line.end &&
              line.end > line.start && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() =>
                    update(line.id, {
                      quantity: String(
                        (Date.parse(line.end) - Date.parse(line.start)) /
                          86400000,
                      ),
                    })
                  }
                >
                  Usar los{" "}
                  {(Date.parse(line.end) - Date.parse(line.start)) / 86400000}{" "}
                  días del tramo
                </button>
              )}
            <div className="form-grid two">
              <Field
                label="Cantidad (opcional)"
                decimal
                unit={units[line.unit].label}
                value={line.quantity}
                onChange={(quantity) => update(line.id, { quantity })}
              />
              <Field
                label="Precio (opcional)"
                decimal
                unit={units[line.unit].price}
                value={line.price}
                onChange={(price) => update(line.id, { price })}
              />
            </div>
            <Field
              label="Importe facturado del tramo"
              decimal
              required
              unit="€"
              value={line.amount}
              onChange={(amount) => update(line.id, { amount })}
            />
            <button
              type="button"
              className="link-button"
              onClick={() =>
                replace(lines.filter((other) => other.id !== line.id))
              }
            >
              <Trash2 size={14} aria-hidden="true" /> Quitar tramo {index + 1}
            </button>
          </div>
        </details>
      ))}
      <div className="price-line-actions">
        <button
          type="button"
          className="link-button"
          onClick={() => replace([])}
        >
          Usar solo el total de {label.toLowerCase()}
        </button>
      </div>
      <p className="small muted">
        Suma los tramos de cada concepto; no repartas los kWh entre fechas por
        número de días. Para potencia, la cantidad es kW × días, meses o años
        según la unidad del precio.
      </p>
    </section>
  );
}
