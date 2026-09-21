"use client";
import { useState } from "react";
import { numberOf, type Profile, type Tariff } from "@/lib/domain";
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
  const [message, setMessage] = useState("");
  const days = numberOf(profile.days);
  const quantities: [keyof Tariff, string, number][] = [
    [
      "energyPeak",
      tariff.kind === "fixed" ? "Energía total" : "Energía punta",
      tariff.kind === "fixed"
        ? numberOf(profile.peakKwh) +
          numberOf(profile.flatKwh) +
          numberOf(profile.valleyKwh)
        : numberOf(profile.peakKwh),
    ],
    ...(tariff.kind === "periods"
      ? ([
          ["energyFlat", "Energía llano", numberOf(profile.flatKwh)],
          ["energyValley", "Energía valle", numberOf(profile.valleyKwh)],
        ] as [keyof Tariff, string, number][])
      : []),
    [
      "powerPeak",
      "Potencia punta",
      (numberOf(profile.peakKw) * days) /
        (tariff.powerUnit === "year" ? 365 : 1),
    ],
    [
      "powerValley",
      "Potencia valle",
      (numberOf(profile.valleyKw) * days) /
        (tariff.powerUnit === "year" ? 365 : 1),
    ],
    ["socialDay", "Bono social del periodo", days],
    ["meterDay", "Alquiler del periodo", days],
  ];
  return (
    <details className="form-section invoice-prices">
      <summary>Calcular precios desde los importes</summary>
      <p className="small muted">
        Si tu factura redondea los precios, copia aquí los importes sin
        impuestos. Calcularemos precios efectivos usando el consumo, los kW y
        los días de esta factura. No añadas de nuevo sus peajes y cargos: ya
        están incluidos.
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
          const next = { ...tariff };
          let applied = false;
          for (const [key, , quantity] of quantities) {
            const amount = amounts[key];
            if (!amount) continue;
            if (
              !/^\d+([.,]\d+)?$/.test(amount) ||
              quantity <= 0 ||
              !Number.isFinite(quantity)
            ) {
              setMessage(
                "Completa el consumo, la potencia y los días correspondientes antes de calcular los precios.",
              );
              return;
            }
            Object.assign(next, {
              [key]: String(Number((numberOf(amount) / quantity).toFixed(12))),
            });
            applied = true;
          }
          if (!applied) {
            setMessage("Introduce al menos un importe de tu factura.");
            return;
          }
          if (amounts.powerPeak || amounts.powerValley)
            next.powerKind = "periods";
          onApply(next);
          setMessage(
            "Precios efectivos aplicados. Puedes revisarlos arriba y comprobar el desglose abajo.",
          );
        }}
      >
        Aplicar importes a los precios
      </button>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </details>
  );
}
