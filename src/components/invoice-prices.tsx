"use client";
import FeedbackNotice, { useFeedback } from "./feedback-notice";
import { useState } from "react";
import { type Profile, type Tariff } from "@/lib/domain";
import {
  invoicePriceQuantities,
  tariffFromInvoiceAmounts,
} from "@/lib/invoice-prices";
import { Field } from "./ui";

export default function InvoicePrices({
  tariff,
  profile,
  onApply,
}: {
  tariff: Tariff;
  profile: Profile;
  onApply: (tariff: Tariff) => void;
}) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const { message, setMessage, dismiss } = useFeedback();
  const quantities = invoicePriceQuantities(tariff, profile);
  return (
    <details className="form-section invoice-prices">
      <summary>Calcular precios desde los importes</summary>
      <p className="small muted">
        Si tu factura redondea los precios, copia aquí los importes sin
        impuestos. Calcularemos precios efectivos usando el consumo, los kW y
        los días de esta factura. No añadas de nuevo sus peajes y cargos: ya
        están incluidos. Introduce el importe SNOEE solo si no forma parte del
        importe de energía que has copiado.
      </p>
      <div className="form-grid two">
        {quantities.map(([key, label]) => (
          <Field
            key={key}
            label={label}
            unit="€"
            decimal
            value={amounts[key] ?? ""}
            onChange={(value) => {
              setAmounts({ ...amounts, [key]: value });
              setMessage("");
            }}
          />
        ))}
      </div>
      <button
        type="button"
        className="button secondary"
        onClick={() => {
          try {
            onApply(tariffFromInvoiceAmounts(tariff, profile, amounts));
            setMessage(
              "Precios efectivos aplicados. Puedes revisarlos arriba y comprobar el desglose abajo.",
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "No se pudieron calcular los precios.",
              "error",
            );
          }
        }}
      >
        Aplicar importes a los precios
      </button>
      {message && (
        <FeedbackNotice
          key={message.id}
          message={message}
          onDismiss={dismiss}
        />
      )}
    </details>
  );
}
